import Anthropic from '@anthropic-ai/sdk';
import { Client, GenerateArticleRequest, KnowledgeItem, PromptTemplate, PromptType } from '@/types';
import { buildRagContext } from './rag';

export interface GenerationOutput {
  title: string;
  contentMarkdown: string; // 01_ブログ本文.md（CTA混入完全ゼロ）
  midCtaMarkdown?: string;  // 02_文中CTA.md
  endCtaMarkdown?: string;  // 03_文末CTA.md
  metaDescription: string;
  suggestedTags: string[];
  usedKnowledgeIds: string[];
}

/**
 * APIキーで利用可能なモデル一覧を取得し、最適なモデルを選択する
 */
export async function resolveBestModel(apiKey: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const availableModels: string[] = (data.data || []).map((m: any) => m.id);

      const preferred = [
        'claude-sonnet-5',
        'claude-5-sonnet',
        'claude-sonnet-5-latest',
        'claude-opus-5',
        'claude-5-opus',
        'claude-haiku-4-5',
        'claude-4-5-haiku',
        'claude-3-7-sonnet-latest',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-latest',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-haiku-20240307',
      ];

      for (const pref of preferred) {
        if (availableModels.includes(pref)) {
          return pref;
        }
      }

      const sonnetModel = availableModels.find((m) => m.includes('sonnet'));
      if (sonnetModel) return sonnetModel;

      const opusModel = availableModels.find((m) => m.includes('opus'));
      if (opusModel) return opusModel;

      const anyClaude = availableModels.find((m) => m.includes('claude'));
      if (anyClaude) return anyClaude;

      if (availableModels.length > 0) return availableModels[0];
    }
  } catch (err) {
    console.warn('Failed to dynamically fetch available models:', err);
  }

  return 'claude-sonnet-5';
}

/**
 * 独立した文中CTAおよび文末CTAパーツを生成する関数
 */
async function generateStandaloneCtas(
  anthropic: Anthropic | null,
  model: string,
  client: Client,
  keyword: string,
  conclusion: string,
  promptType: PromptType
): Promise<{ midCta: string; endCta: string }> {
  const isRecruiting = promptType === 'recruiting';
  const isMedical = promptType === 'medical';

  if (!anthropic) {
    return generateFallbackCtas(client, keyword, conclusion, promptType);
  }

  const ctaPrompt = `以下の企業・店舗情報とキーワードに基づき、ブログ記事にパーツとして差し込む【02_文中CTA】と【03_文末CTA】の2つの独立したCTAパーツをMarkdown形式で作成してください。

【対象企業・店舗】
名称: ${client.name}
業種: ${client.industry || '一般'}
モード: ${isRecruiting ? '採用特化' : isMedical ? '医療' : '通常（365ブログ）'}

【記事のテーマ・キーワード】
キーワード: ${keyword}
記事の結論: ${conclusion}

【出力フォーマット（JSONのみ）】:
{
  "midCta": "### 「では、自社の場合はどうなのか？」と気になったら\\n\\n[読者が記事中盤で疑問を感じた時に、相談や自社の状況確認へ進めるための案内文（150〜250文字）]\\n\\n【${client.name}への相談案内】\\n📞 お電話でのご相談 / 🌐 WEB相談予約\\n▶ [関連ガイド：サービス詳細・選び方の基準]",
  "endCta": "### [読者の背中を押す魅力的なクロージング見出し]\\n\\n[記事を読み終えた読者へ向けた、${client.name}の想い・特徴・無料相談へのお誘い文（200〜350文字）]\\n\\n【無料相談・お問い合わせはこちら】\\n📞 お電話でのご相談 / 🌐 WEB相談予約\\n▶ [公式サイト・サービス一覧]"
}`;

  try {
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: 'user', content: ctaPrompt }],
    });

    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        midCta: parsed.midCta || '',
        endCta: parsed.endCta || '',
      };
    }
  } catch (err) {
    console.warn('Standalone CTA generation fallback:', err);
  }

  return generateFallbackCtas(client, keyword, conclusion, promptType);
}

function generateFallbackCtas(client: Client, keyword: string, conclusion: string, promptType: PromptType): { midCta: string; endCta: string } {
  if (promptType === 'recruiting') {
    return {
      midCta: `### 「${client.name}で働くイメージをもっと知りたい」と思ったら

求人票に書かれた条件だけでなく、実際の仕事内容や職場の雰囲気を確かめたい方は、カジュアル面談や会社見学をお気軽にご利用ください。

【会社見学・カジュアル面談のご案内】
[採用窓口・エントリーリンク]
▶ [職種別の仕事内容と1日の流れ]`,
      endCta: `### 自分に合う仕事か、納得して判断してみませんか？

${client.name}では、応募前に仕事のリアルや求める姿勢をオープンにお伝えし、入社後のミスマッチを防ぐ採用を行っています。ご興味のある方は、まずはお気軽にご相談ください。

【募集要項・エントリーはこちら】
[応募フォーム・採用特設ページリンク]`,
    };
  }

  if (promptType === 'medical') {
    return {
      midCta: `### 症状について専門医へのご相談をご検討中の方へ

${client.name}では、患者様一人ひとりの症状やご不安に寄り添った丁寧な診察・カウンセリングを行っております。

【Web予約・お問い合わせ】
[診療時間・アクセス・予約リンク]`,
      endCta: `### 安心してご相談いただける環境を整えています

${client.name}の診療方針・カウンセリングのご案内。症状についてお悩みの方は、お気軽にご相談ください。

【初診Web予約・ご相談窓口】
[電話番号・公式予約フォームリンク]`,
    };
  }

  return {
    midCta: `### 「では、自社の場合はどうなのか？」と気になったら

状況は一社一社、一軒一軒異なります。自社やご自宅に当てはめた場合の具体的な可能性や判断基準を知りたい方は、${client.name}へお気軽にご相談ください。

【${client.name}への相談案内】
[無料相談・お問い合わせ] ／ [公式サイト]
▶ [関連ガイド：サービス詳細・選び方の基準]`,
    endCta: `### 迷ったときは、まず今の可能性から整理してみませんか？

最初から答えを決めてしまう必要はありません。${client.name}がお客様の想いに対話で寄り添い、最適な道筋を一緒に考えていきます。

【無料相談・お問い合わせはこちら】
[電話番号・公式相談窓口・WEB予約]`,
  };
}

export async function generateArticleWithClaude(
  client: Client,
  knowledges: KnowledgeItem[],
  promptTemplate: PromptTemplate,
  req: GenerateArticleRequest
): Promise<GenerationOutput> {
  const apiKey = req.apiKey || process.env.ANTHROPIC_API_KEY;
  const row = req.sheetRow;
  const promptType = req.promptType || client.promptType || 'general';

  // 文献要約集・ヒアリングシートから関連する章を抽出
  const ragResult = buildRagContext(
    knowledges,
    row.mainKeyword,
    [row.reachKeyword, row.category].filter(Boolean) as string[],
    8
  );

  // ユーザープロンプトテンプレートへの完全マッピング（純粋本文特化）
  const userPrompt = promptTemplate.userPromptTemplate
    .replace(/\{\{CLIENT_NAME\}\}/g, client.name)
    .replace(/\{\{CLIENT_INDUSTRY\}\}/g, client.industry || '一般')
    .replace(/\{\{KEYWORD\}\}/g, row.mainKeyword)
    .replace(/\{\{REACH_KEYWORD\}\}/g, row.reachKeyword || row.suggestKeywords || 'なし')
    .replace(/\{\{SEARCH_INTENT\}\}/g, row.searchIntent)
    .replace(/\{\{SEARCH_STORY\}\}/g, row.searchIntent)
    .replace(/\{\{TARGET_AUDIENCE\}\}/g, row.targetAudience)
    .replace(/\{\{CONCLUSION\}\}/g, row.conclusion)
    .replace(/\{\{ARTICLE_GOAL\}\}/g, row.conclusion)
    .replace(/\{\{UNIQUE_POINT\}\}/g, row.uniquePoint || 'この記事独自の視点・切り口')
    .replace(/\{\{KNOWLEDGE_CONTEXT\}\}/g, ragResult.formattedContext);

  if (!apiKey) {
    return generateMockArticle(client, row, ragResult.usedKnowledgeIds, promptType);
  }

  const selectedModel = await resolveBestModel(apiKey);
  const anthropic = new Anthropic({ apiKey });

  const candidateModels = [
    selectedModel,
    'claude-sonnet-5',
    'claude-opus-5',
    'claude-haiku-4-5',
    'claude-3-7-sonnet-latest',
    'claude-3-5-sonnet-latest',
    'claude-3-haiku-20240307',
  ];

  // 1. 純粋なブログ記事本文の生成
  let articleText = '';
  let lastError: any = null;

  for (const model of Array.from(new Set(candidateModels))) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 8192,
        temperature: 0.2,
        system: promptTemplate.systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      articleText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as any).text)
        .join('\n');

      if (articleText) {
        break;
      }
    } catch (err: any) {
      lastError = err;
      if (err?.status === 404 || err?.message?.includes('not_found_error') || err?.message?.includes('model')) {
        continue;
      }
      throw err;
    }
  }

  if (!articleText) {
    throw lastError || new Error('Claudeモデルでの記事生成に失敗しました');
  }

  // 記事末尾の自己申告テキストを自動除去
  articleText = articleText
    .replace(/[-*_]{3,}\s*\n+\*?\*?文字数[：:]\s*[\d,]+文字?\*?\*?\s*$/i, '')
    .replace(/\*?\*?文字数[：:]\s*[\d,]+文字?\*?\*?\s*$/i, '')
    .trim();

  // 万が一含まれていたタグの完全サニタイズ
  articleText = articleText
    .replace(/=== ARTICLE_START ===/gi, '')
    .replace(/=== ARTICLE_END ===/gi, '')
    .replace(/=== MID_CTA_START ===[\s\S]*?=== MID_CTA_END ===/gi, '')
    .replace(/=== END_CTA_START ===[\s\S]*?=== END_CTA_END ===/gi, '')
    .trim();

  // 2. 独立した「02_文中CTA」と「03_文末CTA」の生成（完全分離処理）
  const { midCta, endCta } = await generateStandaloneCtas(
    anthropic,
    selectedModel,
    client,
    row.mainKeyword,
    row.conclusion,
    promptType
  );

  // タイトル（H1）の抽出
  const lines = articleText.split('\n');
  let title = row.mainKeyword;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      title = trimmed.replace('# ', '').replace(/\*\*/g, '').trim();
      break;
    }
  }

  // デフォルトタグ
  const tags = [
    row.mainKeyword,
    client.name,
    row.category,
    row.suggestKeywords ? row.suggestKeywords.split(/[,、]/)[0].trim() : undefined,
  ].filter(Boolean) as string[];

  return {
    title,
    contentMarkdown: articleText, // 本文（CTA混入完全ゼロ）
    midCtaMarkdown: midCta,       // 独立した文中CTA
    endCtaMarkdown: endCta,       // 独立した文末CTA
    metaDescription: row.conclusion || '',
    suggestedTags: Array.from(new Set(tags)),
    usedKnowledgeIds: ragResult.usedKnowledgeIds,
  };
}

function generateMockArticle(client: Client, row: any, usedKnowledgeIds: string[], promptType: PromptType): GenerationOutput {
  const isMedical = promptType === 'medical';

  let article = '';
  if (isMedical) {
    article = `# ${row.mainKeyword}の正しい理解と経過目安｜${client.name}

${row.conclusion}

### この記事のポイント
* **${row.conclusion}**
* **自己判断せず専門医へ相談することが安心の第一歩**
* **無理な刺激を避け適切なアフターケアを徹底する**

### 先に結論を整理します
* 症状や経過には個人差があるため客観的な判断が必要
* 早期の相談が結果的に負担を軽減する
* 信頼できる医療機関での事前確認が重要

📖 目次
1. 症状の正しい理解とメカニズム
2. 受診を検討する目安と判断基準
3. よくある質問
4. まとめ

## 症状の正しい理解とメカニズム
症状について正しく把握することが重要です。

## 受診を検討する目安と判断基準
### すぐに受診すべき症状
### 経過観察できるケース
### 迷ったときの判断基準

## ${client.name}でよくある質問（FAQ）
### Q1. 治療期間の目安はどのくらいですか？
A. 症状の程度や選択する治療法によって異なります。初診時に丁寧にご案内します。

## まとめ
正しい知識を持ち、不安な場合は専門医へご相談ください。

---
※本記事は一般的な医療情報の提供を目的とし、診断・治療の代替ではありません。症状が続く場合や判断に迷う場合は医師等の専門家へご相談ください。`;
  } else {
    article = `# ${row.mainKeyword}とは？失敗しない判断基準とポイント解説｜${client.name}

${row.conclusion}

### この記事で押さえたい3つの考え方
* **${row.conclusion}**
* **表面的な情報だけでなく現場の工夫や事実を確認する**
* **比較検討を通じて自分たちに最適な選択肢を見極める**

### この記事で確かめていくこと
* なぜ迷いが生じるのか、その根本原因
* 失敗しないための具体的な判断基準
* 相談前に確認しておくべきポイント

### 先に結論を整理します
* ${row.conclusion}
* 専門家との対話を通じて本質を整理する
* 納得できる意思決定が後悔を防ぐ

📖 目次
1. 課題の背景と本質整理
2. 具体的な判断基準
3. 現場の実態・エピソード
4. よくある質問
5. この記事のまとめ

## 課題の背景と本質整理
大切なのは、自社の状況と目的に合った判断基準を持つことです。

## 具体的な判断基準
### 基準1: 目的の明確化
### 基準2: 実績と提案力の確認

## ${client.name}の現場実態・エピソード
${row.uniquePoint || '事実に基づき、最適な提案を心がけています。'}

## ${client.name}でよくある質問（FAQ）
### Q1. 相談前に準備しておくべきものはありますか？
A. 具体的な要望が固まっていなくても問題ありません。現状の課題をお聞かせください。

## この記事のまとめ
まずは自社の現状と優先課題を整理し、納得できる判断を行いましょう。`;
  }

  const { midCta, endCta } = generateFallbackCtas(client, row.mainKeyword, row.conclusion, promptType);

  return {
    title: `${row.mainKeyword}とは？失敗しない判断基準｜${client.name}`,
    contentMarkdown: article,
    midCtaMarkdown: midCta,
    endCtaMarkdown: endCta,
    metaDescription: row.conclusion || '',
    suggestedTags: [row.mainKeyword, client.name],
    usedKnowledgeIds,
  };
}
