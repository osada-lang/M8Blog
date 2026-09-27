import Anthropic from '@anthropic-ai/sdk';
import { Client, GenerateArticleRequest, KnowledgeItem, PromptTemplate } from '@/types';
import { buildRagContext } from './rag';

export interface GenerationOutput {
  title: string;
  contentMarkdown: string;
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

  // ユーザープロンプトテンプレートへの完全マッピング（余計な加工なし）
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

  // 記事末尾の自己申告テキスト（例: **文字数：4,798文字** や 文字数：〇〇文字）を自動除去
  fullText = fullText
    .replace(/[-*_]{3,}\s*\n+\*?\*?文字数[：:]\s*[\d,]+文字?\*?\*?\s*$/i, '')
    .replace(/\*?\*?文字数[：:]\s*[\d,]+文字?\*?\*?\s*$/i, '')
    .trim();

  // Claudeが生成したMarkdownからタイトル（H1）のみを抽出
  const lines = fullText.split('\n');
  let title = row.mainKeyword;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      title = trimmed.replace('# ', '').replace(/\*\*/g, '').trim();
      break;
    }
  }

  return {
    title,
    contentMarkdown: fullText,
    metaDescription: row.conclusion || '',
    suggestedTags: [row.mainKeyword, client.name],
    usedKnowledgeIds: ragResult.usedKnowledgeIds,
  };
}

function generateMockArticle(client: Client, row: any, usedKnowledgeIds: string[]): GenerationOutput {
  const isMedical = client.promptType === 'medical';

  let markdown = '';
  if (isMedical) {
    markdown = `# ${row.mainKeyword}の正しい理解と経過目安｜${client.name}

## 冒頭サマリー（要約）
**【結論】**: ${row.conclusion}

「${row.mainKeyword}」について検索される方の多くは、「施術後の経過に問題がないか」「いつから普段通りの生活に戻れるか」という不安を抱えています。
本記事では、公的知見および院内方針に基づき、症状の経過や受診目安を客観的に解説します。

## 1. この記事の結論
- **一言で言うと**: ${row.conclusion}
- **最も重要なこと**: 無理にいじらず、保湿と紫外線対策を徹底すること
- **まず確認すべきこと**: 照射モードと医師から指示された注意事項

## 2. ${row.mainKeyword}のメカニズムと経過日数
施術後は一時的に熱エネルギーによる反応が生じますが、数日〜1週間程度で徐々に落ち着きます。

### 独自視点・注意点
${row.uniquePoint || '個人差があるため、過度な刺激を避けることが肝要です。'}

## 3. 受診を検討すべき目安
- 赤みや痛みが想定期間を超えて悪化する場合
- 強い腫れや水疱が見られる場合

## 4. よくある質問（FAQ）
**Q. 当日からメイクは可能ですか？**  
A. 照射モードによって異なります。トーニング等の場合は当日から可能なケースが多いですが、診察時の指示に従ってください。

## 5. まとめ
${client.name}では、患者様の不安を解消するための丁寧なカウンセリングを実施しています。ご不安な点はお気軽にご相談ください。

---
※本記事は一般的な医療情報の提供を目的とし、診断・治療の代替ではありません。症状が続く場合や判断に迷う場合は医師等の専門家へご相談ください。
`;
  } else {
    markdown = `# ${row.mainKeyword}とは？失敗しない判断基準とポイント解説｜${client.name}

## 冒頭サマリー（AI要約）
**【結論】**: ${row.conclusion}

「${row.mainKeyword}」について検討する際、何から整理すべきか迷っていませんか？
大切なのは、表面的な情報だけで決めず、自社の状況と目的に合った判断基準を持つことです。

## 1. なぜ「${row.mainKeyword}」で迷いが生じるのか？
多くの企業や担当者が直面する課題は、情報が多すぎて本当に必要な選択肢が見えなくなることです。

### 本記事独自の重要視点
${row.uniquePoint || '事実に基づき、自社に最適な判断基準を整理することが重要です。'}

## 2. ${client.name}における考え方と実績
${client.name}では、お客様の課題を深く理解し、本質的な価値を伝える支援を大切にしています。

## 3. まとめ
まずは自社の現状と優先課題を整理し、納得できる判断を行いましょう。
`;
  }

  return {
    title: `${row.mainKeyword}とは？失敗しない判断基準｜${client.name}`,
    contentMarkdown: markdown,
    metaDescription: row.conclusion || '',
    suggestedTags: [row.mainKeyword, client.name],
    usedKnowledgeIds,
  };
}
