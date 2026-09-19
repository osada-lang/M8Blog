export type PromptType = 'general' | 'medical';

export interface Client {
  id: string;
  name: string;
  industry: string;
  promptType: PromptType;
  description?: string;
  spreadsheetUrl?: string; // KWスプレッドシートへのリンク
  documentUrl?: string; // 文献要約集ドキュメントへのリンク
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeSourceType = 'text' | 'url' | 'pdf' | 'gbp' | 'sns';

export interface KnowledgeItem {
  id: string;
  clientId: string;
  title: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  type: PromptType;
  title: string;
  systemPrompt: string;
  userPromptTemplate: string;
  hallucinationRules: string;
  isDefault: boolean;
  updatedAt: string;
}

// 孫記事の行データ
export interface KeywordSheetRow {
  id: string;
  day?: string;
  role: string; // '孫'
  category?: string;
  mainKeyword: string;
  reachKeyword?: string;
  searchIntent: string;
  targetAudience: string;
  conclusion: string;
  uniquePoint?: string;
  suggestKeywords?: string;
}

export interface FactCheckIssue {
  id: string;
  type: 'hallucination_suspect' | 'medical_law_risk' | 'unsupported_claim' | 'missing_evidence';
  severity: 'high' | 'medium' | 'low';
  highlightText: string;
  reason: string;
  suggestion?: string;
  matchedKnowledgeSource?: string;
}

export interface FactCheckResult {
  score: number; // 0〜100
  totalIssues: number;
  issues: FactCheckIssue[];
  summary: string;
  groundedKnowledgeTitles: string[];
  checkedAt: string;
}

export interface BlogDraft {
  id: string;
  clientId: string;
  keyword: string;
  subKeywords?: string[];
  promptType: PromptType;
  title: string;
  contentMarkdown: string;
  metaDescription: string;
  suggestedTags: string[];
  usedKnowledgeIds: string[];
  factCheck?: FactCheckResult;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateArticleRequest {
  clientId: string;
  sheetRow: KeywordSheetRow;
  promptType: PromptType;
  apiKey?: string;
}
