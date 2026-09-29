import Anthropic from '@anthropic-ai/sdk';
import { Client, GenerateArticleRequest, KnowledgeItem, PromptTemplate } from '@/types';
import { buildRagContext } from './rag';

export interface GenerationOutput {
  title: string;
  contentMarkdown: string; // 01_ブログ本文.md
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

export async function generateArticleWithClaude(
  client: Client,
  knowledges: KnowledgeItem[],
  promptTemplate: PromptTemplate,
  req: GenerateArticleRequest
): Promise<GenerationOutput> {
  const apiKey = req.apiKey || process.env.ANTHROPIC_API_KEY;
  const row = req.sheetRow;

  // 文献要約集・ヒアリングシートから関連する章を抽出
  const ragResult = buildRagContext(
    knowledges,
    row.mainKeyword,
    [row.reachKeyword, row.category].filter(Boolean) as string[],
    8
  );

  // ユーザープロンプトテンプレートへの完全マッピング
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
    return generateMockArticle(client, row, ragResult.usedKnowledgeIds);
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

  let fullText = '';
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

      fullText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as any).text)
        .join('\n');

      if (fullText) {
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

  if (!fullText) {
    throw lastError || new Error('Claudeモデルでの記事生成に失敗しました');
  }

  // 記事末尾の自己申告テキストを自動除去
  fullText = fullText
    .replace(/[-*_]{3,}\s*\n+\*?\*?文字数[：:]\s*[\d,]+文字?\*?\*?\s*$/i, '')
    .replace(/\*?\*?文字数[：:]\s*[\d,]+文字?\*?\*?\s*$/i, '')
    .trim();

  // 頑健な3分割パース処理（タグが省略された場合でも確実に分離）
  let contentMarkdown = '';
  let midCtaMarkdown = '';
  let endCtaMarkdown = '';

  // 1. 文中CTAの抽出
  const midCtaMatch = fullText.match(/=== MID_CTA_START ===([\s\S]*?)(?:=== MID_CTA_END ===|$)/i);
  if (midCtaMatch) {
    midCtaMarkdown = midCtaMatch[1].replace(/=== MID_CTA_END ===/g, '').trim();
  }

  // 2. 文末CTAの抽出
  const endCtaMatch = fullText.match(/=== END_CTA_START ===([\s\S]*?)(?:=== END_CTA_END ===|$)/i);
  if (endCtaMatch) {
    endCtaMarkdown = endCtaMatch[1].replace(/=== END_CTA_END ===/g, '').trim();
  }

  // 3. 本文の抽出
  const articleMatch = fullText.match(/=== ARTICLE_START ===([\s\S]*?)(?:=== ARTICLE_END ===|=== MID_CTA_START ===|$)/i);
  if (articleMatch) {
    contentMarkdown = articleMatch[1].trim();
  } else {
    // === ARTICLE_START === が省略された場合は、MID_CTA_START や END_CTA_START の前までを本文とする
    const midIdx = fullText.indexOf('=== MID_CTA_START ===');
    const endIdx = fullText.indexOf('=== END_CTA_START ===');
    const cutIdx = (midIdx !== -1 && endIdx !== -1) ? Math.min(midIdx, endIdx) : (midIdx !== -1 ? midIdx : endIdx);

    if (cutIdx !== -1) {
      contentMarkdown = fullText.slice(0, cutIdx).trim();
    } else {
      contentMarkdown = fullText.trim();
    }
  }

  // 念のため、残存したすべての === ... === タグを完全除去（サニタイズ）
  contentMarkdown = contentMarkdown
    .replace(/=== ARTICLE_START ===/gi, '')
    .replace(/=== ARTICLE_END ===/gi, '')
    .replace(/=== MID_CTA_START ===/gi, '')
    .replace(/=== MID_CTA_END ===/gi, '')
    .replace(/=== END_CTA_START ===/gi, '')
    .replace(/=== END_CTA_END ===/gi, '')
    .trim();

  if (midCtaMarkdown) {
    midCtaMarkdown = midCtaMarkdown
      .replace(/=== MID_CTA_START ===/gi, '')
      .replace(/=== MID_CTA_END ===/gi, '')
      .trim();
  }

  if (endCtaMarkdown) {
    endCtaMarkdown = endCtaMarkdown
      .replace(/=== END_CTA_START ===/gi, '')
      .replace(/=== END_CTA_END ===/gi, '')
      .trim();
  }

  // タイトル（H1）の抽出
  const lines = contentMarkdown.split('\n');
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
    contentMarkdown,
    midCtaMarkdown: midCtaMarkdown || undefined,
    endCtaMarkdown: endCtaMarkdown || undefined,
    metaDescription: row.conclusion || '',
    suggestedTags: Array.from(new Set(tags)),
    usedKnowledgeIds: ragResult.usedKnowledgeIds,
  };
}

function generateMockArticle(client: Client, row: any, usedKnowledgeIds: string[]): GenerationOutput {
  const isMedical = client.promptType === 'medical';

  let article = '';
  let midCta = '';
  let endCta = '';

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

    midCta = `### 症状について専門医へのご相談をご検討中の方へ
${client.name}では、患者様一人ひとりの症状やご不安に寄り添った丁寧な診察・カウンセリングを行っております。

【Web予約・お問い合わせ】
[診療時間・アクセス・予約リンク]`;

    endCta = `### 安心してご相談いただける環境を整えています
${client.name}の診療方針・カウンセリングのご案内。

【初診Web予約・ご相談窓口】
[電話番号・公式予約フォームリンク]`;
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

    midCta = `### 「では、自社の場合はどうなのか？」と気になったら
${client.name}では、説明しづらい価値や課題を丁寧に整理し、最適な解決策をご提案しています。

【${client.name}への相談案内】
[無料相談・お問い合わせ] ／ [公式サイト]
▶ [関連ガイド：サービス詳細・選び方の基準]`;

    endCta = `### 迷ったときは、まず今の可能性から整理してみませんか？
最初から答えを決めてしまう必要はありません。${client.name}がお客様の想いに対話で寄り添い、最適な道筋を一緒に考えていきます。

【無料相談・お問い合わせはこちら】
[電話番号・公式相談窓口]`;
  }

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
