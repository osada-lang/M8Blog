import Anthropic from '@anthropic-ai/sdk';
import { Client, GenerateArticleRequest, PromptTemplate } from '@/types';
import { buildRagContext } from './rag';
import { KnowledgeItem } from '@/types';

export interface GenerationOutput {
  title: string;
  contentMarkdown: string;
  metaDescription: string;
  suggestedTags: string[];
  usedKnowledgeIds: string[];
}

export async function generateArticleWithClaude(
  client: Client,
  knowledges: KnowledgeItem[],
  promptTemplate: PromptTemplate,
  req: GenerateArticleRequest
): Promise<GenerationOutput> {
  const apiKey = req.apiKey || process.env.ANTHROPIC_API_KEY;

  // RAGコンテキストの構築
  const ragResult = buildRagContext(knowledges, req.keyword, req.subKeywords || []);

  // テンプレート変数の置換
  let userPrompt = promptTemplate.userPromptTemplate
    .replace(/\{\{CLIENT_NAME\}\}/g, client.name)
    .replace(/\{\{CLIENT_INDUSTRY\}\}/g, client.industry || '一般')
    .replace(/\{\{TARGET_AUDIENCE\}\}/g, req.targetAudience || client.targetAudience || '店舗・サービスの利用者')
    .replace(/\{\{KEYWORD\}\}/g, req.keyword)
    .replace(/\{\{SUB_KEYWORDS\}\}/g, (req.subKeywords && req.subKeywords.length > 0) ? req.subKeywords.join(', ') : 'なし')
    .replace(/\{\{KNOWLEDGE_CONTEXT\}\}/g, ragResult.formattedContext)
    .replace(/\{\{WORD_COUNT\}\}/g, String(req.wordCountTarget || 2000));

  if (req.customPromptOverride) {
    userPrompt += `\n\n【追加指示】\n${req.customPromptOverride}`;
  }

  // APIキーがない場合のフォールバック（動作確認用シミュレーション）
  if (!apiKey) {
    return generateMockArticle(client, req, ragResult.usedKnowledgeIds);
  }

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: 0.2, // ハルシネーション抑制のため低めの温度
    system: promptTemplate.systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const fullText = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('\n');

  return parseGeneratedArticle(fullText, req.keyword, ragResult.usedKnowledgeIds);
}

/**
 * 生成されたMarkdownテキストからタイトル、メタディスクリプション、タグをパース
 */
function parseGeneratedArticle(rawText: string, keyword: string, usedKnowledgeIds: string[]): GenerationOutput {
  const lines = rawText.split('\n');
  let title = `${keyword}に関するお役立ちガイド`;
  let metaDescription = '';
  const suggestedTags: string[] = [keyword];

  // タイトル抽出（最初の # 見出し）
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      title = trimmed.replace('# ', '').replace(/\*\*/g, '').trim();
      break;
    }
  }

  // メタディスクリプション抽出
  const metaMatch = rawText.match(/メタディスクリプション[：:]\s*(.+)/i) ||
                    rawText.match(/概要[：:]\s*(.+)/i);
  if (metaMatch && metaMatch[1]) {
    metaDescription = metaMatch[1].trim().slice(0, 160);
  } else {
    // 導入部分から抽出
    const firstParagraph = lines.find(l => l.trim().length > 30 && !l.startsWith('#')) || '';
    metaDescription = firstParagraph.slice(0, 120);
  }

  // タグ抽出
  const tagMatch = rawText.match(/タグ[：:]\s*(.+)/i) ||
                   rawText.match(/推奨タグ[：:]\s*(.+)/i);
  if (tagMatch && tagMatch[1]) {
    const extracted = tagMatch[1].split(/[,、\s]+/).filter(t => t.trim().length > 0 && !t.includes('タグ'));
    suggestedTags.push(...extracted.map(t => t.replace(/^[#]/, '')));
  }

  return {
    title,
    contentMarkdown: rawText,
    metaDescription,
    suggestedTags: Array.from(new Set(suggestedTags)),
    usedKnowledgeIds,
  };
}

/**
 * APIキー未設定時のリアルな下書き生成シミュレータ
 */
function generateMockArticle(client: Client, req: GenerateArticleRequest, usedKnowledgeIds: string[]): GenerationOutput {
  const isMedical = req.promptType === 'medical';
  const subKwText = req.subKeywords?.length ? `（関連: ${req.subKeywords.join('、')}）` : '';

  let markdown = '';
  if (isMedical) {
    markdown = `# ${req.keyword}の原因と治療法とは？${client.name}がわかりやすく解説

「${req.keyword}」でお悩みではありませんか？${subKwText}に関する症状は、放置すると日常生活に支障をきたす場合があります。
本記事では、症状の主な原因や治療の流れ、クリニック選びのポイントについて客観的な視点で詳しく解説します。

## 1. ${req.keyword}の主な原因と症状の特徴
${req.keyword}は、日頃の生活習慣や体質、加齢など多様な要因が重なることで生じます。
- **初期症状**: 軽度の違和感や張り感
- **進行時の症状**: 強い違和感や見た目の変化

症状には個人差があるため、自己判断せず早めに専門医へ相談することが大切です。

## 2. 一般的な治療・改善アプローチ
治療には保存的ケアから専門的な施術まで複数の選択肢が存在します。
1. **カウンセリング・検査**: 症状の進行度や体質に応じた適応の確認
2. **専門的アプローチ**: 医師の診断に基づく適切な施術・処方

※治療効果には個人差があり、ダウンタイムや一時的な赤み・腫れなどのリスクを伴う場合があります。

## 3. ${client.name}における診療方針
当院（${client.name}）では、患者様一人ひとりのライフスタイルと不安に寄り添った丁寧なカウンセリングを大切にしています。

- **安心の事前説明**: リスクや費用についても丁寧にご案内
- **オーダーメイドな提案**: 症状に合わせた最適なケア

[要確認: 自由診療の費用や詳細な治療メニューは診察時にご確認ください]

## 4. よくある質問（Q&A）
**Q. 治療期間はどのくらいかかりますか？**  
A. 症状の度合いや選択する治療法によって異なります。初診時に目安をご案内いたします。

**Q. 痛みや副作用はありますか？**  
A. 施術内容により一時的な違和感が生じる場合がありますが、適切な対策を行っております。

## 5. まとめ
${req.keyword}についてお悩みの方は、我慢せずお気軽に${client.name}までご相談ください。

---
※本記事は一般的な医療・健康情報の提供を目的としており、特定の治療効果を保証するものではありません。症状がある場合は医師の診察をお受けください。

【メタディスクリプション】
${req.keyword}の原因や治療法について${client.name}が解説。症状の特徴からクリニックでの診療方針、注意点までわかりやすくまとめました。

【推奨タグ】
#${req.keyword} #${client.industry} #${client.name} #健康情報
`;
  } else {
    markdown = `# 【2025年最新】${req.keyword}の選び方と失敗しないポイントを徹底解説

「${req.keyword}」を検討中の方に向けて、後悔しない選び方や確認すべき重要ポイントを詳しく解説します。${subKwText}

## 1. なぜ今「${req.keyword}」が注目されているのか？
現代のニーズに合わせ、${req.keyword}に関する選択肢は増えています。
自分にぴったりのサービス・店舗を選ぶためには、以下の3つの基準を押さえておくことが重要です。

- **ポイント1**: 実績と専門性の高さ
- **ポイント2**: 明確な料金体系とサポート体制
- **ポイント3**: 口コミ・利用者のリアルな評判

## 2. ${client.name}ならではの強みとこだわり
${client.name}では、お客様の満足度を最優先に考えたサービスを提供しております。

- **確かな専門性**: 蓄積されたノウハウでお客様の課題を解決
- **丁寧なヒアリング**: ご要望に合わせた柔軟な提案

[要確認: 詳しい料金プランやキャンペーン情報は公式窓口にお問い合わせください]

## 3. よくある失敗例と対策
- **安さだけで選んでしまう**: サポート範囲を事前に確認しましょう。
- **事前に相談しない**: 不明点は事前の問い合わせで解消しておくことが成功の秘訣です。

## 4. まとめ＆お問い合わせ
${req.keyword}をご検討中の方は、ぜひ${client.name}までお気軽にご相談ください。

---
【メタディスクリプション】
${req.keyword}の失敗しない選び方やポイントを${client.name}が徹底解説！後悔しないための重要チェックリストをご紹介します。

【推奨タグ】
#${req.keyword} #${client.name} #${client.industry}
`;
  }

  return {
    title: `${req.keyword}に関するガイド - ${client.name}`,
    contentMarkdown: markdown,
    metaDescription: `${req.keyword}に関する重要ポイントを${client.name}が解説。`,
    suggestedTags: [req.keyword, client.industry, client.name],
    usedKnowledgeIds,
  };
}
