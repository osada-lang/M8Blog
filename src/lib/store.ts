import { BlogDraft, Client, KnowledgeItem, PromptTemplate } from '@/types';
import { DEFAULT_PROMPT_TEMPLATES } from './defaultPrompts';

// 初期クライアントサンプル
export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: '表参道スキンケアクリニック',
    industry: '美容皮膚科・エイジングケア',
    promptType: 'medical',
    description: '最新のレーザー治療と肌診断に基づくパーソナライズ美容医療を提供するクリニック',
    targetAudience: '20代〜40代の肌悩み（毛穴、ニキビ跡、シミ）を持つ女性・男性',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'client-2',
    name: 'テックリペア渋谷店',
    industry: 'スマートフォン・PC即日修理',
    promptType: 'general',
    description: 'iPhone・Mac・WindowsPCのデータ復旧および最短15分即日修理を提供する地域密着店',
    targetAudience: '画面割れやバッテリー劣化、水没で急ぎ修理を希望するビジネスパーソン・学生',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 初期ナレッジ（頭脳）サンプル
export const INITIAL_KNOWLEDGES: KnowledgeItem[] = [
  {
    id: 'know-1',
    clientId: 'client-1',
    title: 'クリニック概要・ドクターの治療方針',
    sourceType: 'text',
    content: `【表参道スキンケアクリニック 基本情報】
所在地: 東京都渋谷区神宮前
診療方針: 患者様本来の肌再生力を引き出す治療を最優先としています。初診時には必ず3D肌画像診断機による詳細なカウンセリングを実施します。
特徴:
- 痛みを抑えた最新ピコレーザー導入
- 完全個室でのプライベート空間
- 明確な料金体系（初診料無料キャンペーン中）
※施術後は一時的な赤みやヒリつきが生じる場合があります。`,
    tags: ['クリニック情報', 'ピコレーザー', 'カウンセリング'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'know-2',
    clientId: 'client-1',
    title: 'Googleビジネスプロフィール（GBP）の口コミ傾向・Q&A',
    sourceType: 'gbp',
    content: `【GBPまとめ】
評価: ★4.8 (レビュー数 180件)
よくある口コミ: 「カウンセリングが丁寧で無理な勧誘が一切なかった」「施術後のアフターフォローが安心」
患者様からよくある質問:
- Q: 当日のメイクは可能ですか？ ➔ A: 施術内容によりますが、ピコトーニング後は当日からミネラルメイク可能です。
- Q: ダウンタイムはどのくらいですか？ ➔ A: ピコスポットは3〜5日程度のかさぶた、トーニングは数時間の赤み程度です。`,
    tags: ['GBP', '口コミ', 'Q&A'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'know-3',
    clientId: 'client-2',
    title: 'テックリペア渋谷店 サービスメニュー＆強み',
    sourceType: 'text',
    content: `【テックリペア渋谷店 概要】
渋谷駅ハチ公口徒歩2分。
強み:
1. 最短15分即日修理対応（画面交換・バッテリー交換）
2. データそのまま修理（バックアップ不要）
3. 安心の90日間無償修理保証つき
対応機種: iPhone全機種、iPad、MacBook、各種WindowsノートPC
公式HP記載の注意点: 水没修理の場合は完全乾燥および基板洗浄のため2〜3時間お時間をいただきます。`,
    tags: ['サービスメニュー', '即日修理', '保証'],
    createdAt: new Date().toISOString(),
  },
];

// クライアント側（ブラウザLocalStorage）またはメモリキャッシュ用のユーティリティ
const STORAGE_KEYS = {
  CLIENTS: 'm8blog_clients',
  KNOWLEDGES: 'm8blog_knowledges',
  PROMPTS: 'm8blog_prompts',
  DRAFTS: 'm8blog_drafts',
  API_KEY: 'm8blog_anthropic_api_key',
};

export const clientStore = {
  getClients(): Client[] {
    if (typeof window === 'undefined') return INITIAL_CLIENTS;
    const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
      return INITIAL_CLIENTS;
    }
    return JSON.parse(data);
  },

  saveClients(clients: Client[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  },

  getKnowledges(clientId?: string): KnowledgeItem[] {
    if (typeof window === 'undefined') return INITIAL_KNOWLEDGES;
    const data = localStorage.getItem(STORAGE_KEYS.KNOWLEDGES);
    let all: KnowledgeItem[] = data ? JSON.parse(data) : INITIAL_KNOWLEDGES;
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGES, JSON.stringify(INITIAL_KNOWLEDGES));
    }
    if (clientId) {
      return all.filter(k => k.clientId === clientId);
    }
    return all;
  },

  saveKnowledges(knowledges: KnowledgeItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.KNOWLEDGES, JSON.stringify(knowledges));
  },

  getPrompts(): PromptTemplate[] {
    if (typeof window === 'undefined') return DEFAULT_PROMPT_TEMPLATES;
    const data = localStorage.getItem(STORAGE_KEYS.PROMPTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(DEFAULT_PROMPT_TEMPLATES));
      return DEFAULT_PROMPT_TEMPLATES;
    }
    return JSON.parse(data);
  },

  savePrompts(prompts: PromptTemplate[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(prompts));
  },

  getDrafts(clientId?: string): BlogDraft[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.DRAFTS);
    const drafts: BlogDraft[] = data ? JSON.parse(data) : [];
    if (clientId) {
      return drafts.filter(d => d.clientId === clientId);
    }
    return drafts;
  },

  saveDraft(draft: BlogDraft) {
    if (typeof window === 'undefined') return;
    const drafts = this.getDrafts();
    const index = drafts.findIndex(d => d.id === draft.id);
    if (index >= 0) {
      drafts[index] = draft;
    } else {
      drafts.unshift(draft);
    }
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
  },

  deleteDraft(id: string) {
    if (typeof window === 'undefined') return;
    const drafts = this.getDrafts().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
  },

  getApiKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  saveApiKey(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  },
};
