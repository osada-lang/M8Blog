export type PromptType = 'general' | 'medical';

export interface Client {
  id: string;
  name: string;
  industry: string; // 例: 美容皮膚科、歯科、整骨院、不動産、ITなど
  promptType: PromptType;
  description?: string;
  targetAudience?: string;
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

export interface KeywordJob {
  keyword: string;
  subKeywords?: string[];
  targetSearchIntent?: string;
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
  score: number; // 0〜100 (100が最も信頼性が高い)
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
  subKeywords: string[];
  promptType: PromptType;
  title: string;
  contentMarkdown: string;
  metaDescription: string;
  suggestedTags: string[];
  usedKnowledgeIds: string[];
  factCheck?: FactCheckResult;
  status: 'draft' | 'reviewed' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface GenerateArticleRequest {
  clientId: string;
  keyword: string;
  subKeywords?: string[];
  promptType: PromptType;
  targetAudience?: string;
  wordCountTarget?: number;
  customPromptOverride?: string;
  apiKey?: string;
}

export interface FactCheckRequest {
  content: string;
  clientId: string;
  promptType: PromptType;
  apiKey?: string;
}
