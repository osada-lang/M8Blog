import Anthropic from '@anthropic-ai/sdk';
import { Client, GenerateArticleRequest, KnowledgeItem, PromptTemplate, PromptType } from '@/types';
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

/**
 * 選択されたキーワード・検索意図・結論に完全に連動したCTAを動的生成する関数
 */
async function generateStandaloneCtas(
  anthropic: Anthropic | null,
  model: string,
  client: Client,
  row: any,
  promptType: PromptType
): Promise<{ midCta: string; endCta: string }> {
  const isRecruiting = promptType === 'recruiting';
  const isMedical = promptType === 'medical';
  const isFaval = client.name.includes('ファーバル') || client.id.includes('faval');

  if (!anthropic) {
    return generateDynamicFallbackCtas(client, row, promptType);
  }

  const ctaPrompt = `以下の企業・店舗情報と【選択されたキーワード・設計情報】に基づき、この記事に差し込む【02_文中CTA】と【03_文末CTA】の2つのCTAパーツを、キーワードの内容（${row.mainKeyword}）に完全に連動させてMarkdown形式で作成してください。

【対象企業・店舗】
名称: ${client.name}
業種: ${client.industry || '一般'}
連絡先/相談窓口: ${isFaval ? '📞 052-680-8520 ／ 無料相談・お問い合わせ' : '無料相談・お問い合わせ'}

【選択されたターゲットキーワード情報】
メインキーワード: ${row.mainKeyword}
検索意図（読者の悩み）: ${row.searchIntent}
想定読者: ${row.targetAudience}
記事の結論: ${row.conclusion}

【出力ルール】
必ず「${row.mainKeyword}」に関する読者の悩み・疑問に寄り添ったオリジナルなCTA文面を作成し、以下の区切りタグで出力してください：
※【重要】：文末CTAには電話番号やURLリンクを付けず、最後の【ボタン文言】までで文章を終了してください。

=== MID_CTA_START ===
### 「では、${row.mainKeyword}について自社の場合はどうなのか？」と気になったら
[${row.mainKeyword}について悩んでいる読者が、相談や状況確認へ進めるための案内文（150〜250文字）]

【${client.name}への相談案内】
${isFaval ? '📞 052-680-8520 ／ [無料相談・お問い合わせ]' : '[無料相談・お問い合わせ] ／ [公式サイト]'}
▶ [関連ガイド：${row.mainKeyword}の判断基準・詳細]
=== MID_CTA_END ===

=== END_CTA_START ===
### [${row.mainKeyword}で迷う読者の背中を押す魅力的なクロージング見出し]
[記事を読み終えた読者へ向けた、${client.name}の特徴・想い・相談へのお誘い文（200〜350文字）]

【${row.mainKeyword}について一緒に整理する】
=== END_CTA_END ===`;

  try {
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      temperature: 0.2,
      messages: [{ role: 'user', content: ctaPrompt }],
    });

    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');

    const midMatch = text.match(/=== MID_CTA_START ===([\s\S]*?)=== MID_CTA_END ===/i);
    const endMatch = text.match(/=== END_CTA_START ===([\s\S]*?)=== END_CTA_END ===/i);

    let midCta = midMatch ? midMatch[1].trim() : '';
    let endCta = endMatch ? endMatch[1].trim() : '';

    if (midCta && endCta) {
      return { midCta, endCta };
    }
  } catch (err) {
    console.warn('Dynamic CTA generation exception:', err);
  }

  return generateDynamicFallbackCtas(client, row, promptType);
}

/**
 * キーワード連動型の動的フォールバックCTA生成（文末CTAはボタン文言までで完結）
 */
function generateDynamicFallbackCtas(client: Client, row: any, promptType: PromptType): { midCta: string; endCta: string } {
  const isFaval = client.name.includes('ファーバル') || client.id.includes('faval');
  const isPaqla = client.name.includes('PAQLA') || client.id.includes('paqla');
  const kw = row.mainKeyword;
  const conclusion = row.conclusion || `${kw}の判断基準`;

  if (promptType === 'recruiting') {
    return {
      midCta: `### 「${kw}について、${client.name}で働くイメージをもっと知りたい」と思ったら

求人票に書かれた条件だけでなく、${kw}に関する実際の仕事内容や職場の雰囲気を確かめたい方は、カジュアル面談や会社見学をお気軽にご利用ください。

【会社見学・カジュアル面談のご案内】
[募集要項・採用情報] ／ [会社見学・お問い合わせ]
▶ [職種別の仕事内容と1日の流れ]
▶ [${client.name}の教育・研修制度と働く環境]`,
      endCta: `### ${kw}で迷っているなら、まずは一度お話ししてみませんか？

${conclusion}

${client.name}では、応募前に仕事のリアルや求める姿勢をオープンにお伝えし、入社後のミスマッチを防ぐ採用を行っています。「自分にできるだろうか」と迷っているなら、お気軽にご相談ください。

【募集要項・エントリーはこちら】`,
    };
  }

  if (promptType === 'medical') {
    return {
      midCta: `### ${kw}について専門医へのご相談をご検討中の方へ

${client.name}では、${kw}でお悩みの方一人ひとりの症状やご不安に寄り添った丁寧な診察・カウンセリングを行っております。一人で抱え込まず、まずはお気軽にご相談ください。

【Web予約・お問い合わせ】
[Web予約・お問い合わせ窓口] ／ [公式サイト]
▶ [診療案内・初診の流れ]`,
      endCta: `### ${kw}の不安を解消し、安心してご相談いただける環境を整えています

${conclusion}

${client.name}の診療方針・カウンセリングのご案内。症状についてお悩みの方は、お気軽にご相談ください。

【初診Web予約・ご相談窓口】`,
    };
  }

  // ファーバルデザイン様向け（実物Wordファイル準拠）
  if (isFaval) {
    return {
      midCta: `### 「では、${kw}について自分の家はどうなのか？」と気になったら

${conclusion}

建物の状態やご家族の暮らし方は一軒一軒異なります。${kw}について自分たちの条件に当てはめた可能性を知りたい場合は、全体を一緒に見てくれる相手に相談してみることをお勧めします。

株式会社ファーバルデザインは、一級建築士が窓口となり、最初の相談から設計・施工までワンストップで伴走します。名古屋で家づくり・リノベーションをご検討中の方は、まず全体像の整理からお気軽にどうぞ。

📞 052-680-8520 ／ [無料相談・お問い合わせ]
▶ [関連ガイド：${kw}の判断基準]
▶ [株式会社ファーバルデザインの想い・実績]`,
      endCta: `### 建て替えるか、活かすか。まずは今の家の可能性から整理してみませんか？

${conclusion}

判断基準を理解しても、実際の構造や劣化状態、希望する間取り、これから住み続けたい年数などは一軒一軒異なります。「この家は残せるのか」「リノベーションする価値があるのか」「建て替えたほうがいいのか」と迷っているなら、どちらかに決めてしまう前に、自分たちの条件を一度整理してみる方法があります。

株式会社ファーバルデザインは、新築・リノベーションに加え、庭・外構や不動産まで含めた住まいづくりをワンストップで提案しています。一級建築士が窓口となり、最初の相談から設計、施工、アフターサポートまで一貫して関わります。

大切にしているのは、最初から「建て替える」「リノベーションする」と答えを決めることではなく、どんな暮らしがしたいのか、何を心地よいと感じるのかを対話しながら整理していくこと。建築・庭・不動産それぞれの専門性を活かしながら、今ある住まいとこれからの暮らしを一緒に考えていきます。

【建て替えかリノベーションか、一緒に整理する】`,
    };
  }

  // PAQLA様向け
  if (isPaqla) {
    return {
      midCta: `### 「では、${kw}について自社の場合はどうなのか？」と気になったら

${conclusion}

自社の強みやサービス内容は、社内にいると当たり前になっていて見えにくいものです。${kw}について本当に伝えるべき価値は何なのか、どのように映像や営業資料に落とし込むべきか迷ったら、第三者の取材を活用してみる方法があります。

株式会社PAQLAでは、テレビ局出身のディレクターが徹底した取材を行い、説明しづらい価値を小学3年生にもわかる言葉と映像へ翻訳します。

【株式会社PAQLAへの相談案内】
[無料相談・お問い合わせ] ／ [公式サイト]
▶ [関連ガイド：${kw}と映像制作・取材の流れ]
▶ [株式会社PAQLAの想い・実績]`,
      endCta: `### ${kw}の課題を、伝わる力に変える。まずは一度お話ししてみませんか？

${conclusion}

商品やサービスに確かな技術やこだわりがあるのに、営業現場や採用でうまく伝わらない。そのもどかしさは、決して情報が足りないからではなく、相手の理解に合わせた「翻訳」ができていないからです。

株式会社PAQLAは、年間100本以上の映像制作実績とテレビ局で培った取材力・構成力で、貴社の本質的な価値を掘り起こし、顧客や求職者の心に届く表現へ変換します。

【無料相談・お問い合わせはこちら】`,
    };
  }

  // 汎用
  return {
    midCta: `### 「では、${kw}について自社の場合はどうなのか？」と気になったら

${conclusion}

状況は一社一社、一軒一軒異なります。${kw}に関する具体的な可能性や判断基準を知りたい方は、${client.name}へお気軽にご相談ください。

【${client.name}への相談案内】
[無料相談・お問い合わせ] ／ [公式サイト]
▶ [関連ガイド：${kw}の詳細・選び方の基準]`,
    endCta: `### ${kw}で迷ったときは、まず今の可能性から整理してみませんか？

${conclusion}

最初から答えを決めてしまう必要はありません。${client.name}がお客様の想いに対話で寄り添い、最適な道筋を一緒に考えていきます。

【${kw}について一緒に整理する】`,
  };
}

/**
 * 本文中の最適な位置（第2章/H2見出し2の直後）に「文中CTA挿入推奨位置」コメントを自動挿入する関数
 */
function injectMidCtaPlaceholder(markdown: string): string {
  const lines = markdown.split('\n');
  let h2Count = 0;
  let inserted = false;
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    newLines.push(line);

    // H2見出し（## ）をカウント
    if (line.trim().startsWith('## ') && !line.trim().includes('目次') && !line.trim().includes('まとめ') && !line.trim().includes('よくある質問')) {
      h2Count++;
      // 2つ目のH2セクションの内容が終わる箇所（3つ目のH2の手前、または2つ目のH2の数段落後）に挿入
      if (h2Count === 2 && !inserted) {
        // 次のH2またはFAQの手前を探す
        let targetIdx = i + 1;
        while (targetIdx < lines.length) {
          if (lines[targetIdx].trim().startsWith('## ') || lines[targetIdx].trim().startsWith('---')) {
            break;
          }
          targetIdx++;
        }
        // ループ内で挿入位置をマーク
      }
    }
  }

  // 2つ目のH2セクションの内容の後に挿入する処理
  const finalLines: string[] = [];
  let currentH2 = 0;
  let hasInjected = false;

  for (let j = 0; j < lines.length; j++) {
    const l = lines[j];
    if (l.trim().startsWith('## ') && !l.trim().includes('目次') && !l.trim().includes('まとめ') && !l.trim().includes('よくある質問')) {
      currentH2++;
      if (currentH2 === 3 && !hasInjected) {
        // 3つ目のH2の直前に文中CTA挿入位置コメントを挿入
        finalLines.push('');
        finalLines.push('<!-- 【文中CTA挿入推奨位置】（※ブログ投稿時はここに「02_文中CTA」を配置してください） -->');
        finalLines.push('');
        hasInjected = true;
      }
    }
    finalLines.push(l);
  }

  // 3つ目のH2がない場合のフォールバック（目次の後、または中央付近）
  if (!hasInjected) {
    return markdown + '\n\n<!-- 【文中CTA挿入推奨位置】（※ブログ投稿時はここに「02_文中CTA」を配置してください） -->';
  }

  return finalLines.join('\n');
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

  // 本文中の最適な位置に「文中CTA挿入推奨位置」コメントを自動挿入
  articleText = injectMidCtaPlaceholder(articleText);

  // 2. 選択されたキーワード情報（row）に100%連動した「02_文中CTA」と「03_文末CTA」の生成（文末はボタン文言までで完結）
  const { midCta, endCta } = await generateStandaloneCtas(
    anthropic,
    selectedModel,
    client,
    row,
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
    contentMarkdown: articleText, // 本文（文中CTA挿入位置コメント入り）
    midCtaMarkdown: midCta || undefined,
    endCtaMarkdown: endCta || undefined,
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

<!-- 【文中CTA挿入推奨位置】（※ブログ投稿時はここに「02_文中CTA」を配置してください） -->

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

<!-- 【文中CTA挿入推奨位置】（※ブログ投稿時はここに「02_文中CTA」を配置してください） -->

## ${client.name}の現場実態・エピソード
${row.uniquePoint || '事実に基づき、最適な提案を心がけています。'}

## ${client.name}でよくある質問（FAQ）
### Q1. 相談前に準備しておくべきものはありますか？
A. 具体的な要望が固まっていなくても問題ありません。現状の課題をお聞かせください。

## この記事のまとめ
まずは自社の現状と優先課題を整理し、納得できる判断を行いましょう。`;
  }

  const { midCta, endCta } = generateDynamicFallbackCtas(client, row, promptType);

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
