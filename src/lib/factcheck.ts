import Anthropic from '@anthropic-ai/sdk';
import { FactCheckIssue, FactCheckResult, KnowledgeItem, PromptType } from '@/types';
import { resolveBestModel } from './claude';
import { searchTavily } from './tavily';

// 薬機法・医療広告ガイドラインで問題視されやすいNGパターン一覧
const MEDICAL_LAW_RISK_PATTERNS = [
  { regex: /(絶対|必ず|100%|完璧に)(治る|改善|解消|治癒|消える)/g, label: '治療効果の断定・確約表現', severity: 'high' as const },
  { regex: /(副作用(は|が)?(一切)?(なし|ゼロ|ありません))/g, label: '安全性の誇大表現・副作用なしの断定', severity: 'high' as const },
  { regex: /(日本一|業界No\.?1|地域No\.?1|最高峰|最高の|世界初)/g, label: '客観的根拠のない最上級・比較優良表現', severity: 'high' as const },
  { regex: /(永久に|二度と(再発しない|生えない))/g, label: '永久的効果の保証表現', severity: 'high' as const },
  { regex: /(魔法のような|劇的に完治|誰でも確実に)/g, label: '誇大広告・誇張表現', severity: 'medium' as const },
];

export async function runFactCheck(
  content: string,
  knowledges: KnowledgeItem[],
  promptType: PromptType,
  apiKey?: string
): Promise<FactCheckResult> {
  const issues: FactCheckIssue[] = [];
  const knowledgeTitles = knowledges.map((k) => k.title);
  const combinedKnowledgeText = knowledges.map((k) => `【${k.title}】\n${k.content}`).join('\n\n');

  // 1. ルールベースの薬機法・医療広告リスク検知
  if (promptType === 'medical') {
    for (const item of MEDICAL_LAW_RISK_PATTERNS) {
      const matches = content.match(item.regex);
      if (matches) {
        for (const match of matches) {
          issues.push({
            id: `med-${Math.random().toString(36).slice(2, 9)}`,
            type: 'medical_law_risk',
            severity: item.severity,
            highlightText: match,
            reason: `医療広告ガイドライン/薬機法に抵触する恐れがあります（${item.label}）。`,
            suggestion: `「個人差があります」「改善が期待できます」「サポートします」などの客観的・穏当な表現に修正してください。`,
          });
        }
      }
    }

    // 免責事項の有無チェック
    if (!content.includes('免責') && !content.includes('保証するものではありません') && !content.includes('専門家へご相談')) {
      issues.push({
        id: `med-disclaimer-${Math.random().toString(36).slice(2, 9)}`,
        type: 'medical_law_risk',
        severity: 'medium',
        highlightText: '記事末尾',
        reason: '医療記事に必要な注意喚起（免責事項）が見当たりません。',
        suggestion: '「※本記事は一般的な医療情報の提供を目的とし、診断・治療の代替ではありません。」を追記してください。',
      });
    }
  }

  // 2. 「[要確認]」プレースホルダーの検知
  const placeholderMatches = content.match(/\[要確認:[^\]]+\]/g);
  if (placeholderMatches) {
    for (const match of placeholderMatches) {
      issues.push({
        id: `placeholder-${Math.random().toString(36).slice(2, 9)}`,
        type: 'unsupported_claim',
        severity: 'low',
        highlightText: match,
        reason: '元ナレッジに情報が不足しているため、公開前に店舗側での確認・追記が必要です。',
        suggestion: '公式サイトや最新の料金表・メニューを確認して正確な数値を入力してください。',
      });
    }
  }

  // 3. LLM ＋ Web検索（Tavily）を用いたディープファクトチェック
  const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
  if (effectiveApiKey && content.length > 100) {
    try {
      const deepIssues = await runDeepWebFactCheck(content, combinedKnowledgeText, promptType, effectiveApiKey);
      issues.push(...deepIssues);
    } catch (e) {
      console.warn('Deep web fact check fallback:', e);
    }
  }

  // スコアの算出
  let penalty = 0;
  for (const issue of issues) {
    if (issue.severity === 'high') penalty += 20;
    else if (issue.severity === 'medium') penalty += 10;
    else if (issue.severity === 'low') penalty += 3;
  }
  const score = Math.max(0, Math.min(100, 100 - penalty));

  let summary = '';
  if (issues.length === 0) {
    summary = 'ファクトチェック合格: 文献・事実データおよびWeb情報との不整合は見つかりませんでした。';
  } else {
    const highCount = issues.filter((i) => i.severity === 'high').length;
    if (highCount > 0) {
      summary = `重大な注意点が${highCount}件検出されました。公開前に該当箇所の確認を推奨します。`;
    } else {
      summary = `${issues.length}件の確認推奨事項（Web裏付け・注意点）があります。`;
    }
  }

  return {
    score,
    totalIssues: issues.length,
    issues,
    summary,
    groundedKnowledgeTitles: knowledgeTitles,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Claude ＋ Tavily Web検索によるディープファクトチェック
 */
async function runDeepWebFactCheck(
  content: string,
  knowledgeText: string,
  promptType: PromptType,
  apiKey: string
): Promise<FactCheckIssue[]> {
  const selectedModel = await resolveBestModel(apiKey);
  const anthropic = new Anthropic({ apiKey });

  // 1. 記事からWeb検索で裏付け調査すべき主張・統計・法律キーワードを抽出
  const extractPrompt = `以下のブログ記事から、公的統計、法律・制度、業界データ、医学的事実など「Web上の公的・最新データで裏付け調査すべき重要事項」を1〜2個抽出し、Web検索用クエリ（日本語）を作成してください。

【ブログ記事抜粋】
${content.slice(0, 3000)}

出力は以下のJSONのみ：
{
  "queries": ["検索クエリ1", "検索クエリ2"]
}`;

  let queries: string[] = [];
  try {
    const queryResp = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 300,
      temperature: 0.1,
      messages: [{ role: 'user', content: extractPrompt }],
    });
    const qText = queryResp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
    const qJson = qText.match(/\{[\s\S]*\}/);
    if (qJson) {
      const parsed = JSON.parse(qJson[0]);
      queries = (parsed.queries || []).slice(0, 2);
    }
  } catch (err) {
    console.warn('Failed to extract search queries:', err);
  }

  // 2. Tavily Web検索を実行
  let webSearchResultsText = '';
  let topResultUrl = '';
  let topResultTitle = '';

  for (const q of queries) {
    const results = await searchTavily(q);
    if (results.length > 0) {
      if (!topResultUrl) {
        topResultUrl = results[0].url;
        topResultTitle = results[0].title;
      }
      webSearchResultsText += `【Web検索クエリ: ${q}】\n` + results.map((r) => `- [${r.title}](${r.url}): ${r.content}`).join('\n') + '\n\n';
    }
  }

  // 3. 記事、元資料、Web検索結果を突き合わせて検証
  const verifyPrompt = `以下の【元資料（文献・ヒアリング）】、【Web検索による最新公的データ】、【生成されたブログ記事】を照合し、ハルシネーション（元資料に根拠がない架空創作）、最新公的データとの齟齬、医療系リスクをチェックしてください。

【元資料（文献・ヒアリング）】
${knowledgeText.slice(0, 3000)}

【Web検索による最新公的データ】
${webSearchResultsText ? webSearchResultsText.slice(0, 3000) : '（Web検索結果なし）'}

【生成されたブログ記事】
${content.slice(0, 4000)}

以下のJSONフォーマットのみを出力してください。問題がなければ空配列 [] を返してください。
[
  {
    "type": "web_grounding_info" または "hallucination_suspect" または "medical_law_risk",
    "severity": "high" または "medium" または "low",
    "highlightText": "問題または裏付け対象の記事中の短い抜粋テキスト",
    "reason": "なぜ問題なのか、またはWebデータとの照合結果",
    "suggestion": "どう修正・確認すべきかの提案",
    "sourceTitle": "関連するWebソースのタイトル（存在する場合）",
    "sourceUrl": "関連するWebソースのURL（存在する場合）"
  }
]`;

  try {
    const resp = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 1500,
      temperature: 0.1,
      messages: [{ role: 'user', content: verifyPrompt }],
    });

    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any) => ({
        id: `web-${Math.random().toString(36).slice(2, 9)}`,
        type: item.type || 'web_grounding_info',
        severity: item.severity || 'low',
        highlightText: item.highlightText || '',
        reason: item.reason || '',
        suggestion: item.suggestion || '',
        sourceTitle: item.sourceTitle || topResultTitle || undefined,
        sourceUrl: item.sourceUrl || topResultUrl || undefined,
      }));
    }
  } catch (err) {
    console.error('Failed to run deep verification:', err);
  }

  return [];
}
