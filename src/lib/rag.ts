import { KnowledgeItem } from '@/types';

export interface RetrievedChunk {
  knowledgeId: string;
  title: string;
  sourceType: string;
  sourceUrl?: string;
  text: string;
  relevanceScore: number;
}

export interface RagResult {
  formattedContext: string;
  usedKnowledgeIds: string[];
  chunks: RetrievedChunk[];
}

/**
 * テキストを指定サイズのチャンクに分割する
 */
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  if (!text || text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);
    chunks.push(chunk);
    startIndex += chunkSize - overlap;
  }

  return chunks;
}

/**
 * キーワードとナレッジ間の簡易BM25/TF-IDFライクな関連スコア計算
 */
function calculateRelevance(text: string, searchTerms: string[]): number {
  let score = 0;
  const lowerText = text.toLowerCase();

  for (const term of searchTerms) {
    if (!term) continue;
    const lowerTerm = term.toLowerCase();
    
    // 完全一致
    const count = (lowerText.match(new RegExp(lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += count * 3;

    // 部分一致（2文字以上の分割）
    if (lowerTerm.length >= 2) {
      for (let i = 0; i < lowerTerm.length - 1; i++) {
        const sub = lowerTerm.slice(i, i + 2);
        if (lowerText.includes(sub)) {
          score += 0.5;
        }
      }
    }
  }

  return score;
}

/**
 * クライアントの全ナレッジからキーワードに最も関連するコンテキストを抽出・整形する
 */
export function buildRagContext(
  knowledges: KnowledgeItem[],
  keyword: string,
  subKeywords: string[] = [],
  maxChunks: number = 8
): RagResult {
  if (!knowledges || knowledges.length === 0) {
    return {
      formattedContext: '※ 登録されたクライアント資料（頭脳）がありません。一般的な解説として執筆し、具体的情報は[要確認]としてください。',
      usedKnowledgeIds: [],
      chunks: [],
    };
  }

  const searchTerms = [keyword, ...subKeywords].filter(Boolean);
  const allChunks: RetrievedChunk[] = [];

  for (const item of knowledges) {
    const textChunks = chunkText(item.content, 600, 100);

    for (const chunk of textChunks) {
      const score = calculateRelevance(chunk + ' ' + item.title + ' ' + item.tags.join(' '), searchTerms);
      allChunks.push({
        knowledgeId: item.id,
        title: item.title,
        sourceType: item.sourceType,
        sourceUrl: item.sourceUrl,
        text: chunk,
        relevanceScore: score,
      });
    }
  }

  // スコア順にソート（スコアが同じ場合はタイトルの関連性や元の順序を維持）
  allChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // 上位チャンクを選択
  const selectedChunks = allChunks.slice(0, maxChunks);
  const usedKnowledgeIds = Array.from(new Set(selectedChunks.map(c => c.knowledgeId)));

  // プロンプト用コンテキストをフォーマット
  const formattedSections = selectedChunks.map((c, index) => {
    return `【資料${index + 1}: ${c.title} (${c.sourceType}${c.sourceUrl ? ` - ${c.sourceUrl}` : ''})】\n${c.text.trim()}`;
  });

  const formattedContext = formattedSections.join('\n\n');

  return {
    formattedContext,
    usedKnowledgeIds,
    chunks: selectedChunks,
  };
}
