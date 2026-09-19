import Anthropic from '@anthropic-ai/sdk';
import { FactCheckIssue, FactCheckResult, KnowledgeItem, PromptType } from '@/types';

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

  // 3. LLMを用いたディープファクトチェック（APIキーがある場合）
  const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
  if (effectiveApiKey && combinedKnowledgeText.length > 50) {
    try {
      const llmIssues = await runLlmFactCheck(content, combinedKnowledgeText, promptType, effectiveApiKey);
      issues.push(...llmIssues);
    } catch (e) {
      console.warn('LLM Fact check fallback to rule-based:', e);
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
    summary = 'ファクトチェック合格: 文献・事実データとの不整合や誇大表現のリスクは見つかりませんでした。';
  } else {
    const highCount = issues.filter((i) => i.severity === 'high').length;
    if (highCount > 0) {
      summary = `重大な注意点が${highCount}件検出されました。公開前に該当箇所の修正を推奨します。`;
    } else {
      summary = `${issues.length}件の確認推奨事項があります。表現をご確認ください。`;
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

async function runLlmFactCheck(
  content: string,
  knowledgeText: string,
  promptType: PromptType,
  apiKey: string
): Promise<FactCheckIssue[]> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = `以下の【元資料（文献要約集）】と【生成されたブログ記事】を照合し、ハルシネーション（元資料に根拠がない架空の創作・数値捏造）や、医療系リスク（誇大広告、薬機法違反リスク）をチェックしてください。

【元資料（文献要約集）】
${knowledgeText.slice(0, 5000)}

【ブログ記事】
${content.slice(0, 5000)}

【モード】: ${promptType === 'medical' ? '医療系（薬機法・医療広告ガイドライン適用）' : '普通（365ブログ・一般企業）'}

以下のJSONフォーマットのみを出力してください。問題がなければ空配列 [] を返してください。
[
  {
    "type": "hallucination_suspect" または "medical_law_risk" または "unsupported_claim",
    "severity": "high" または "medium" または "low",
    "highlightText": "問題のある記事中の短い抜粋テキスト",
    "reason": "なぜ問題なのか（資料にない創作、誇大表現など）",
    "suggestion": "どう修正すべきかの提案"
  }
]`;

  const candidateModels = [
    'claude-3-5-sonnet-latest',
    'claude-3-5-sonnet-20240620',
    'claude-3-haiku-20240307',
  ];

  let text = '';
  for (const model of candidateModels) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 1500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });

      text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as any).text)
        .join('\n');
      if (text) break;
    } catch {
      continue;
    }
  }

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any) => ({
        id: `llm-${Math.random().toString(36).slice(2, 9)}`,
        type: item.type || 'hallucination_suspect',
        severity: item.severity || 'medium',
        highlightText: item.highlightText || '',
        reason: item.reason || '',
        suggestion: item.suggestion || '',
      }));
    }
  } catch (err) {
    console.error('Failed to parse LLM fact check output:', err);
  }

  return [];
}
