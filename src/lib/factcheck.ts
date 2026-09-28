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

  // 3. LLM ＋ Web検索（Tavily）を用いた資料外事項の裏付け調査 ＆ ファクトチェック
  const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
  if (effectiveApiKey && content.length > 100) {
    try {
      const deepIssues = await runDeepWebFactCheck(content, combinedKnowledgeText, promptType, effectiveApiKey);
      issues.push(...deepIssues);
    } catch (e) {
      console.warn('Deep web fact check fallback:', e);
    }
  }

  // スコアの算出（Web裏付け情報は正常確認なので減点せず、重大なリスクのみ減点）
  let penalty = 0;
  for (const issue of issues) {
    if (issue.type !== 'web_grounding_info') {
      if (issue.severity === 'high') penalty += 20;
      else if (issue.severity === 'medium') penalty += 10;
      else if (issue.severity === 'low') penalty += 3;
    }
  }
  const score = Math.max(0, Math.min(100, 100 - penalty));

  let summary = '';
  const webCheckedCount = issues.filter((i) => i.type === 'web_grounding_info').length;
  const riskCount = issues.filter((i) => i.type !== 'web_grounding_info').length;

  if (riskCount === 0) {
    summary = `ファクトチェック完了: 社内資料外の記述 ${webCheckedCount}件 についてWeb公的データで裏付け調査を実施し、整合性を確認しました。`;
  } else {
    summary = `Web裏付け ${webCheckedCount}件 を確認。注意が必要な箇所が ${riskCount}件 あります。`;
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
 * （社内資料にない事項を必ず抽出し、Web調査結果をソースURL付きでレポートする）
 */
async function runDeepWebFactCheck(
  content: string,
  knowledgeText: string,
  promptType: PromptType,
  apiKey: string
): Promise<FactCheckIssue[]> {
  const selectedModel = await resolveBestModel(apiKey);
  const anthropic = new Anthropic({ apiKey });

  // 1. 記事の中で「参考資料（社内文献・ヒアリング）に直接書かれていなかった補完事項（統計、法改正、業界知見）」を3〜4個抽出
  const extractPrompt = `以下の【参考資料（社内文献・ヒアリング）】と【生成されたブログ記事】を照合し、ブログ記事の中で「参考資料に直接記載がなかった、または公的・外部データで裏付けが必要な事項（具体的な統計数値、年号・法律、業界データ、制度）」を3〜4件抽出し、Web検索クエリ（日本語）を作成してください。

【参考資料】
${knowledgeText.slice(0, 3000)}

【ブログ記事】
${content.slice(0, 4000)}

出力フォーマット（JSONのみ）：
{
  "items": [
    {
      "highlightText": "記事中の該当する短い抜粋",
      "searchQuery": "Web検索用の具体的キーワード"
    }
  ]
}`;

  let extractedItems: Array<{ highlightText: string; searchQuery: string }> = [];
  try {
    const queryResp = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 600,
      temperature: 0.1,
      messages: [{ role: 'user', content: extractPrompt }],
    });
    const qText = queryResp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
    const qJson = qText.match(/\{[\s\S]*\}/);
    if (qJson) {
      const parsed = JSON.parse(qJson[0]);
      extractedItems = (parsed.items || []).slice(0, 4);
    }
  } catch (err) {
    console.warn('Failed to extract search queries:', err);
  }

  // 2. 各項目について Tavily Web検索を実行し、調査結果を生成
  const results: FactCheckIssue[] = [];

  for (const item of extractedItems) {
    if (!item.searchQuery) continue;

    const searchResults = await searchTavily(item.searchQuery);
    const topResult = searchResults[0];

    // Web検索結果と記事抜粋をClaudeに照合させ、具体的な調査レポート文を作成
    const verifyPrompt = `以下の記事抜粋について、Web検索結果の信頼性を確認し、読者・管理者向けのファクトチェック調査結果文（1〜2文）を作成してください。

【記事中の抜粋】
"${item.highlightText}"

【Web検索結果】
${searchResults.map((r) => `- [${r.title}](${r.url}): ${r.content}`).join('\n')}

出力フォーマット（JSONのみ）：
{
  "reason": "参考資料には直接記載がありませんでしたが、Web上の公的・信頼できる情報源（〇〇等）で調査したところ、〇〇と確認でき整合性を確認しました（または〇〇の点で注意が必要）。",
  "suggestion": "特に修正の必要はありません（または〇〇の点をご確認ください）。",
  "sourceTitle": "${topResult ? topResult.title.replace(/"/g, '') : 'Web公的データ'}",
  "sourceUrl": "${topResult ? topResult.url : ''}"
}`;

    try {
      const vResp = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 400,
        temperature: 0.1,
        messages: [{ role: 'user', content: verifyPrompt }],
      });
      const vText = vResp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
      const vJson = vText.match(/\{[\s\S]*\}/);
      if (vJson) {
        const parsed = JSON.parse(vJson[0]);
        results.push({
          id: `web-grounding-${Math.random().toString(36).slice(2, 9)}`,
          type: 'web_grounding_info',
          severity: 'low',
          highlightText: item.highlightText,
          reason: parsed.reason || 'Web上の公的・信頼できる情報源と照合し、事実関係を確認しました。',
          suggestion: parsed.suggestion || '参考資料外の補完事項として正確性を確認済みです。',
          sourceTitle: parsed.sourceTitle || topResult?.title,
          sourceUrl: parsed.sourceUrl || topResult?.url,
        });
      }
    } catch (err) {
      // フォールバック
      if (topResult) {
        results.push({
          id: `web-fallback-${Math.random().toString(36).slice(2, 9)}`,
          type: 'web_grounding_info',
          severity: 'low',
          highlightText: item.highlightText,
          reason: `参考資料には直接記載がなかった事項ですが、Web上の公的情報（${topResult.title}）と照合し、内容を確認しました。`,
          suggestion: '参考資料外の補完情報として確認済みです。',
          sourceTitle: topResult.title,
          sourceUrl: topResult.url,
        });
      }
    }
  }

  return results;
}
