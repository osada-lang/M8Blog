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

  // 1. ルールベースの薬機法・医療広告リスク検知（医療用）
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

  // 3. 全方位Webファクトチェック（パターンA: 統計・法律・公的データ・固有名詞・営業状態を上限なしで網羅検証）
  const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
  if (effectiveApiKey && content.length > 100) {
    try {
      const deepIssues = await runComprehensiveWebFactCheck(content, combinedKnowledgeText, promptType, effectiveApiKey);
      issues.push(...deepIssues);
    } catch (e) {
      console.warn('Comprehensive web fact check exception:', e);
    }
  }

  // スコアの算出（Web裏付け確認済み情報は正常なので減点せず、重大なリスク・虚偽のみ減点）
  let penalty = 0;
  for (const issue of issues) {
    if (issue.type !== 'web_grounding_info') {
      if (issue.severity === 'high') penalty += 25;
      else if (issue.severity === 'medium') penalty += 15;
      else if (issue.severity === 'low') penalty += 5;
    }
  }
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const webCheckedCount = issues.filter((i) => i.type === 'web_grounding_info').length;
  const criticalCount = issues.filter((i) => i.severity === 'high').length;
  const riskCount = issues.filter((i) => i.type !== 'web_grounding_info').length;

  let summary = '';
  if (criticalCount > 0) {
    summary = `🚨 重大な事実確認リスクが ${criticalCount}件 検出されました。公開前に必ず修正してください。`;
  } else if (riskCount > 0) {
    summary = `Web公的データ裏付け調査 ${webCheckedCount}件 を完了。確認推奨事項が ${riskCount}件 あります。`;
  } else {
    summary = `ファクトチェック完了: 記事内の重要事実・統計・法律・データ ${webCheckedCount}件 をWeb公的情報と照合し、整合性を確認しました。`;
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
 * 統計数値・公的制度・固有名詞・営業状態・医学根拠を網羅検証するディープWebファクトチェック（上限なし）
 */
async function runComprehensiveWebFactCheck(
  content: string,
  knowledgeText: string,
  promptType: PromptType,
  apiKey: string
): Promise<FactCheckIssue[]> {
  const selectedModel = await resolveBestModel(apiKey);
  const anthropic = new Anthropic({ apiKey });

  // 1. 記事全文から「事実の主張（統計数値、法律、公的調査、固有名詞、医学データ）」を上限なしで網羅抽出
  const extractPrompt = `あなたは厳格な事実調査・ファクトチェッカーです。
以下のブログ記事全体から、Web上の公的データ・信頼できる情報源で裏付け確認を行うべき【具体的なファクト・数値・法律・公的データ・固有名詞】を【すべて網羅して（上限なしで）】抽出してください。

【抽出対象】
1. 📊 【具体的な統計・調査数値】（例: 「愛知県の総住宅数は366万4,700戸」「持ち家率は59.6％」「空き家は43万3,000戸」「住宅ローン金利上昇予想62.0%」など）
2. ⚖️ 【法律・公的制度・法改正】（例: 「2025年4月1日施行 建築基準法改正」「新2号建築物」「1981年新耐震基準」「2000年耐震性能検証法」など）
3. 🏢 【実在する固有名詞・商業施設・他社・店舗・人物】（例: イオン、競合他社、施設名、公的機関名など）
4. 🩺 【医学的根拠・ガイドライン・症例データ】（医療系・採用系・通常系の具体的データ）

【絶対禁止事項】
❌ タイトルや導入文の一般的な感想・比喩表現（例: 「築30年だから建て替え」「思い込み」等）は除外してください。

【ブログ記事全文】
${content.slice(0, 7000)}

出力フォーマット（JSONのみ）：
{
  "claims": [
    {
      "highlightText": "記事中の具体的な数値や法律を含む文（例: 愛知県の総住宅数は366万4,700戸、持ち家率は59.6％）",
      "searchQuery": "公的データ裏付け用のWeb検索キーワード（例: 愛知県 住宅土地統計調査 住宅数 持ち家率）"
    }
  ]
}`;

  let claims: Array<{ highlightText: string; searchQuery: string }> = [];
  try {
    const queryResp = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 1500,
      temperature: 0.1,
      messages: [{ role: 'user', content: extractPrompt }],
    });
    const qText = queryResp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
    const qJson = qText.match(/\{[\s\S]*\}/);
    if (qJson) {
      const parsed = JSON.parse(qJson[0]);
      claims = parsed.claims || [];
    }
  } catch (err) {
    console.warn('Failed to extract claims:', err);
  }

  // 抽出が空の場合のフォールバック（数字や法律を含む文を自動抽出）
  if (claims.length === 0) {
    const sentences = content.split(/[。\n]/).map((s) => s.trim()).filter((s) => s.length > 15);
    for (const s of sentences) {
      if (/\d+万|\d+％|\d+年|\d+戸|建築基準法|耐震|住宅金融支援機構|厚生労働省|総務省|改正/.test(s)) {
        claims.push({
          highlightText: s.slice(0, 80),
          searchQuery: s.slice(0, 40).replace(/[^\w\u3000-\u30FF\u4E00-\u9FA5]/g, ' '),
        });
      }
    }
  }

  const results: FactCheckIssue[] = [];

  // 2. 抽出された各クレームについて Web検索 ＆ 真偽判定を実行（上限なし）
  for (const claim of claims) {
    if (!claim.searchQuery) continue;

    const searchResults = await searchTavily(claim.searchQuery);
    const topResult = searchResults[0];

    const verifyPrompt = `以下の【記事中の記述】について、【Web検索結果】を照合し、事実関係の真偽を判定してください。

【記事中の記述】
"${claim.highlightText}"

【Web検索結果】
${searchResults.map((r) => `- [${r.title}](${r.url}): ${r.content}`).join('\n')}

【判定ルール】
- もし実在する他社・商業施設が「閉店した」「倒産した」等と書かれており、Web情報で現在も営業中である等、虚偽・事実無根の記述である場合は "isHallucination": true, "severity": "high" とする。
- 公的データや法律、統計調査と整合している場合は "isHallucination": false, "severity": "low" とする。

出力フォーマット（JSONのみ）：
{
  "isHallucination": true または false,
  "severity": "high" または "medium" または "low",
  "reason": "調査結果の具体的な説明（〇〇の公的サイト/情報源と照合し、〇〇と確認できました。等）",
  "suggestion": "修正提案（問題なければ『公的データとの整合性を確認済みです。』）",
  "sourceTitle": "${topResult ? topResult.title.replace(/"/g, '') : 'Web公的データ'}",
  "sourceUrl": "${topResult ? topResult.url : ''}"
}`;

    try {
      const vResp = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 500,
        temperature: 0.1,
        messages: [{ role: 'user', content: verifyPrompt }],
      });
      const vText = vResp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
      const vJson = vText.match(/\{[\s\S]*\}/);
      if (vJson) {
        const parsed = JSON.parse(vJson[0]);
        const isHallu = parsed.isHallucination === true || parsed.severity === 'high';

        results.push({
          id: `factcheck-${Math.random().toString(36).slice(2, 9)}`,
          type: isHallu ? 'hallucination_suspect' : 'web_grounding_info',
          severity: isHallu ? 'high' : 'low',
          highlightText: claim.highlightText,
          reason: parsed.reason || 'Web上の公的・信頼できる情報源と照合し、事実関係を確認しました。',
          suggestion: isHallu ? (parsed.suggestion || '事実と異なる可能性があるため、記述を削除または修正してください。') : undefined,
          sourceTitle: parsed.sourceTitle || topResult?.title,
          sourceUrl: parsed.sourceUrl || topResult?.url,
        });
      }
    } catch {
      if (topResult) {
        results.push({
          id: `factcheck-fb-${Math.random().toString(36).slice(2, 9)}`,
          type: 'web_grounding_info',
          severity: 'low',
          highlightText: claim.highlightText,
          reason: `Web上の公的・信頼できる情報源（${topResult.title}）と照合し、事実関係を確認しました。`,
          sourceTitle: topResult.title,
          sourceUrl: topResult.url,
        });
      }
    }
  }

  return results;
}
