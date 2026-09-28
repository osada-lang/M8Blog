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
        reason: '元資料に情報が不足しているため、公開前に店舗側での確認・追記が必要です。',
        suggestion: '最新の情報をご確認のうえ、正確な数値を入力してください。',
      });
    }
  }

  // 3. パターンB: 資料外検知モード（社内参考資料に書かれていない新しい補完・創作事項のみを検出し、Webで真偽調査）
  const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
  if (effectiveApiKey && content.length > 100) {
    try {
      const outsideIssues = await runPatternBOutsideFactCheck(content, combinedKnowledgeText, promptType, effectiveApiKey);
      issues.push(...outsideIssues);
    } catch (e) {
      console.warn('Pattern B outside fact check exception:', e);
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

  const outsideCheckedCount = issues.filter((i) => i.type === 'web_grounding_info').length;
  const criticalCount = issues.filter((i) => i.severity === 'high').length;
  const riskCount = issues.filter((i) => i.type !== 'web_grounding_info').length;

  let summary = '';
  if (criticalCount > 0) {
    summary = `🚨 重大な事実確認リスク（資料外の虚偽・ハルシネーション疑い）が ${criticalCount}件 検出されました。公開前に必ず修正してください。`;
  } else if (riskCount > 0) {
    summary = `確認推奨事項が ${riskCount}件 あります（社内資料外の補完事項: ${outsideCheckedCount}件）。`;
  } else if (outsideCheckedCount > 0) {
    summary = `社内資料外の記述 ${outsideCheckedCount}件 を検出し、Web公的データで裏付け調査を実施して整合性を確認しました。`;
  } else {
    summary = `参考資料以外から持ってきた情報はありませんでした（すべて社内参考資料に準拠して執筆されています）。`;
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
 * パターンB（資料外検知モード）：
 * 記事全文と社内参考資料を照合し、参考資料に記載が【ない】事項（AIが独自に付け足した他社名、商業施設、統計、制度など）のみを抽出してWeb検索で真偽調査する
 */
async function runPatternBOutsideFactCheck(
  content: string,
  knowledgeText: string,
  promptType: PromptType,
  apiKey: string
): Promise<FactCheckIssue[]> {
  const selectedModel = await resolveBestModel(apiKey);
  const anthropic = new Anthropic({ apiKey });

  // 1. 参考資料に記載が【ない】新しい事実的主張のみを抽出
  const extractPrompt = `あなたは厳格な事実調査・ファクトチェッカーです。
以下の【社内参考資料（文献・ヒアリング）】と【生成されたブログ記事】を照合し、ブログ記事の中で【社内参考資料に直接書かれていない、AIが独自に補完・追加した客観的事実（実在する他社名・商業施設・店舗、資料外の統計数値、資料外の法律・制度）】を抽出してください。

【重要ルール】
・【社内参考資料】に既に書かれている事実や統計数値（例: 資料に記載のある愛知県の住宅数や金利データなど）は【抽出不要（除外）】です。
・【社内参考資料】に記載が全くないにもかかわらず、記事内で具体的に断定・言及されている事項（例: 実在する施設名「〇〇のイオン」の営業状態、資料外の数値など）のみを抽出してください。
・資料外の事項がなければ空配列 [] を返してください。

【社内参考資料（文献・ヒアリング）】
${knowledgeText.slice(0, 6000)}

【ブログ記事全文】
${content.slice(0, 7000)}

出力フォーマット（JSONのみ）：
{
  "outsideClaims": [
    {
      "highlightText": "社内参考資料に記載がなかった記事中の具体的な抜粋",
      "searchQuery": "Web検索用の具体的キーワード（例: ○○ イオン 営業状況 / ○○法律 改正）"
    }
  ]
}`;

  let outsideClaims: Array<{ highlightText: string; searchQuery: string }> = [];
  try {
    const queryResp = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 800,
      temperature: 0.1,
      messages: [{ role: 'user', content: extractPrompt }],
    });
    const qText = queryResp.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
    const qJson = qText.match(/\{[\s\S]*\}/);
    if (qJson) {
      const parsed = JSON.parse(qJson[0]);
      outsideClaims = parsed.outsideClaims || [];
    }
  } catch (err) {
    console.warn('Failed to extract outside claims:', err);
  }

  if (outsideClaims.length === 0) {
    return []; // 資料外の勝手な追加がなければ0件（完全合格）
  }

  const results: FactCheckIssue[] = [];

  // 2. 資料外の項目について Tavily Web検索 ＆ 真偽判定を実行
  for (const claim of outsideClaims) {
    if (!claim.searchQuery) continue;

    const searchResults = await searchTavily(claim.searchQuery);
    const topResult = searchResults[0];

    const verifyPrompt = `以下の【記事中の資料外の記述】について、【Web検索結果】を照合し、事実関係の真偽を判定してください。

【記事中の記述（社内資料にはない情報）】
"${claim.highlightText}"

【Web検索結果】
${searchResults.map((r) => `- [${r.title}](${r.url}): ${r.content}`).join('\n')}

【判定ルール】
- 実在する他社や商業施設について虚偽・事実無根の記述（例: 営業中なのに「閉店した」等）である場合は "isHallucination": true, "severity": "high" とする。
- Web上の公的・信頼できる情報源で内容の正確性が確認できた場合は "isHallucination": false, "severity": "low" とする。

出力フォーマット（JSONのみ）：
{
  "isHallucination": true または false,
  "severity": "high" または "medium" または "low",
  "reason": "調査結果の具体的な説明（社内参考資料には記載がなかった事項ですが、Web上の公的サイト/情報源（〇〇）で調査したところ、〇〇と確認できました。等）",
  "suggestion": "修正提案（虚偽の場合は『事実と異なるため削除・修正してください』、問題なければ『Webデータとの整合性を確認済みです。』）",
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
          reason: parsed.reason || '社内参考資料には記載がなかった事項ですが、Web上の公的情報と照合し確認しました。',
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
          reason: `社内参考資料には直接記載がなかった事項ですが、Web上の公的情報（${topResult.title}）と照合し、内容を確認しました。`,
          sourceTitle: topResult.title,
          sourceUrl: topResult.url,
        });
      }
    }
  }

  return results;
}
