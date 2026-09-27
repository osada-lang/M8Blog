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
export function chunkText(text: string, chunkSize: number = 800, overlap: number = 150): string[] {
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
 * キーワードとナレッジ間の関連スコア計算
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

    // 部分一致
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
 * クライアントの全資料からキーワードに関連するコンテキストを抽出
 */
export function buildRagContext(
  knowledges: KnowledgeItem[],
  keyword: string,
  subKeywords: string[] = [],
  maxChunks: number = 8
): RagResult {
  if (!knowledges || knowledges.length === 0) {
    return {
      formattedContext: '',
      usedKnowledgeIds: [],
      chunks: [],
    };
  }

  const searchTerms = [keyword, ...subKeywords].filter(Boolean);
  const allChunks: RetrievedChunk[] = [];

  for (const item of knowledges) {
    const textChunks = chunkText(item.content, 800, 150);

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

  allChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const selectedChunks = allChunks.slice(0, maxChunks);
  const usedKnowledgeIds = Array.from(new Set(selectedChunks.map((c) => c.knowledgeId)));

  const formattedSections = selectedChunks.map((c, index) => {
    return `【資料${index + 1}: ${c.title}】\n${c.text.trim()}`;
  });

  const formattedContext = formattedSections.join('\n\n');

  return {
    formattedContext,
    usedKnowledgeIds,
    chunks: selectedChunks,
  };
}
