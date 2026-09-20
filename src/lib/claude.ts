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

      // 優先度順で最初に見つかった利用可能モデルを返す
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

      // 優先リストに完全一致がない場合、Sonnet > Opus > Haiku の部分一致で選択
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

  // フォールバック
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

  // 文献要約集からキーワードに関連する章をRAG検索
  const ragResult = buildRagContext(
    knowledges,
    row.mainKeyword,
    [row.reachKeyword, row.category].filter(Boolean) as string[],
    6
  );

  // ユーザープロンプトテンプレートへの完全マッピング
  const userPrompt = promptTemplate.userPromptTemplate
    .replace(/\{\{CLIENT_NAME\}\}/g, client.name)
    .replace(/\{\{CLIENT_INDUSTRY\}\}/g, client.industry || '一般')
    .replace(/\{\{KEYWORD\}\}/g, row.mainKeyword)
    .replace(/\{\{REACH_KEYWORD\}\}/g, row.reachKeyword || row.suggestKeywords || '特になし')
    .replace(/\{\{SEARCH_INTENT\}\}/g, row.searchIntent)
    .replace(/\{\{SEARCH_STORY\}\}/g, row.searchIntent)
    .replace(/\{\{TARGET_AUDIENCE\}\}/g, row.targetAudience)
    .replace(/\{\{CONCLUSION\}\}/g, row.conclusion)
    .replace(/\{\{ARTICLE_GOAL\}\}/g, row.conclusion)
    .replace(/\{\{UNIQUE_POINT\}\}/g, row.uniquePoint || 'この記事独自の視点・切り口')
    .replace(/\{\{KNOWLEDGE_CONTEXT\}\}/g, ragResult.formattedContext);

  // APIキー未設定時のモック生成（動作確認用）
  if (!apiKey) {
    return generateMockArticle(client, row, ragResult.usedKnowledgeIds);
  }

  // 利用可能な最適モデルを自動解決
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
        max_tokens: 4500,
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

  return parseGeneratedArticle(fullText, row.mainKeyword, ragResult.usedKnowledgeIds);
}

function parseGeneratedArticle(rawText: string, keyword: string, usedKnowledgeIds: string[]): GenerationOutput {
  const lines = rawText.split('\n');
  let title = `${keyword}に関するお役立ちガイド`;
  let metaDescription = '';
  const suggestedTags: string[] = [keyword];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      title = trimmed.replace('# ', '').replace(/\*\*/g, '').trim();
      break;
    }
  }

  const metaMatch =
    rawText.match(/メタディスクリプション[：:]\s*(.+)/i) ||
    rawText.match(/概要[：:]\s*(.+)/i);
  if (metaMatch && metaMatch[1]) {
    metaDescription = metaMatch[1].trim().slice(0, 160);
  } else {
    const firstParagraph = lines.find((l) => l.trim().length > 30 && !l.startsWith('#')) || '';
    metaDescription = firstParagraph.slice(0, 120);
  }

  const tagMatch =
    rawText.match(/タグ[：:]\s*(.+)/i) ||
    rawText.match(/推奨タグ[：:]\s*(.+)/i);
  if (tagMatch && tagMatch[1]) {
    const extracted = tagMatch[1].split(/[,、\s]+/).filter((t) => t.trim().length > 0 && !t.includes('タグ'));
    suggestedTags.push(...extracted.map((t) => t.replace(/^[#]/, '')));
  }

  return {
    title,
    contentMarkdown: rawText,
    metaDescription,
    suggestedTags: Array.from(new Set(suggestedTags)),
    usedKnowledgeIds,
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
    markdown = `# ${row.mainKeyword}とは？失敗しない判断基準と職種の違いを徹底解説

## 冒頭サマリー（AI要約）
**【結論】**: ${row.conclusion}

「${row.mainKeyword}」に興味を持ったものの、「本当に自分にできるのか」「華やかなイメージだけで決めて後悔しないか」と迷っていませんか？
転職や応募で大切なのは、勢いだけで決めず、仕事内容と自分の適性を客観的に整理して判断することです。

## 1. なぜ「${row.mainKeyword}」で迷いが生じるのか？
SNSマーケティングの仕事は、単にスマホで動画を投稿する作業ではありません。
クライアントの採用課題や集客課題をヒアリングし、企画、撮影、編集、運用、分析改善まで多岐にわたる役割が存在します。

### 本記事独自の重要視点
${row.uniquePoint || '仕事内容を6つの判断軸で整理し、自分に合う役割を見極めることが重要です。'}

## 2. 職種ごとの役割分担
1. **SNSディレクター**: 企画・進行・分析改善
2. **採用ディレクター**: 企業の採用課題へのアプローチ
3. **動画編集・制作**: 素材編集・テロップ設計
4. **法人営業**: 企業へのヒアリング・提案

## 3. ${client.name}における育成方針と実態
${client.name}では、未経験からでも安心して挑戦できるよう、OJT研修や明確な業務フローを整備しています。
スケジュール管理や丁寧なコミュニケーションを重視し、現実の業務内容をオープンに共有しています。

## 4. よくある質問（FAQ）
**Q. 未経験でも応募可能ですか？**  
A. 可能です。SNSへの興味に加え、既存の接客・事務・営業などで培った段取り力や質問力が大きな強みになります。

## 5. まとめ
自分の強みが「つくる・進める・提案する」のどこにあるかを整理し、納得できる応募判断を行いましょう。
`;
  }

  return {
    title: `${row.mainKeyword}とは？失敗しない判断基準｜${client.name}`,
    contentMarkdown: markdown,
    metaDescription: `${row.mainKeyword}について${client.name}が解説。${row.conclusion}`,
    suggestedTags: [row.mainKeyword, client.industry, client.name],
    usedKnowledgeIds,
  };
}
