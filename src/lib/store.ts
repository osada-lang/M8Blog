import { BlogDraft, Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { DEFAULT_PROMPT_TEMPLATES } from './defaultPrompts';

// 初期クライアント（セニスル ＆ 美容クリニック）
export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-senisuru',
    name: '株式会社セニスル',
    industry: 'SNSマーケティング・SNS採用支援',
    promptType: 'general',
    description: '名古屋を拠点にSNS運用・動画制作・採用ブランディングを展開する企業',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'client-clinic',
    name: '表参道スキンケアクリニック',
    industry: '美容皮膚科・エイジングケア',
    promptType: 'medical',
    description: 'ピコレーザーや肌画像診断に基づくパーソナライズ治療を提供するクリニック',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 初期文献要約集（セニスル実データ）
export const INITIAL_KNOWLEDGES: KnowledgeItem[] = [
  {
    id: 'know-senisuru-1',
    clientId: 'client-senisuru',
    title: '文献要約: 業界歴史とSNS採用の背景（職業安定法〜スマホ普及）',
    sourceType: 'text',
    content: `【業界歴史・法制度・背景の要約】
1. 職業安定法（1947年）: 求職者に正しい労働情報を伝える原則。誇大広告や誤認表示の禁止。SNS採用でも「楽しい印象」だけでなく現実の業務内容を伝えることが重要。
2. 就職情報誌〜インターネット求人（1960〜2000年代）: 単なる求人告知から「複数企業を比較する市場」へ変化。
3. スマートフォン普及（2010年代〜）: 世帯保有率90%超。求職者は日常的にSNS（TikTok, Instagram, YouTube）で企業の実態や口コミを比較・検索して判断するようになった。`,
    tags: ['業界歴史', '職業安定法', 'SNS採用市場'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'know-senisuru-2',
    clientId: 'client-senisuru',
    title: '文献要約: セニスルの職種・仕事内容・働き方の実態',
    sourceType: 'text',
    content: `【株式会社セニスル 組織・職種・働き方ファクト】
1. 主な職種:
   - SNSディレクター: 企画、台本作成、撮影進行、投稿管理、分析改善
   - 採用ディレクター: 企業の採用課題ヒアリング、採用ブランディング設計
   - 動画編集: 撮影素材の編集、テロップ、テンポ設計
   - 法人営業: 企業へのSNS活用提案、ヒアリング
2. 求められる姿勢: 単なるSNS好きだけでなく、スケジュール管理、丁寧な顧客折衝、仮説検証の姿勢。
3. 勤務形態: 名古屋拠点。実残業の抑制、OJT研修制度、数値に基づく明確な評価体系。`,
    tags: ['セニスル会社情報', '職種一覧', '研修・働き方'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'know-clinic-1',
    clientId: 'client-clinic',
    title: '文献要約: 美容医療ガイドラインとピコレーザーのダウンタイム',
    sourceType: 'text',
    content: `【美容医療エビデンス・院内方針】
1. ピコレーザーの特性: 従来のQスイッチレーザーに比べ熱損傷が少なく、ダウンタイム（赤み・かさぶた）が短い。
2. 注意点とリスク: 照射後に一時的な赤み、乾燥、色素沈着が生じるリスクがあり、紫外線対策が必須。効果には個人差がある。
3. 診療方針: 3D肌画像診断を実施し、無理な勧誘は行わない。明確な費用事前提示。`,
    tags: ['ピコレーザー', 'ガイドライン', 'ダウンタイム'],
    createdAt: new Date().toISOString(),
  },
];

// 初期スプレッドシート（キーワード設計表サンプル）
export const INITIAL_SHEET_ROWS: Record<string, KeywordSheetRow[]> = {
  'client-senisuru': [
    {
      id: 'row-1',
      day: '1',
      role: '親',
      category: '仕事内容・転職判断',
      mainKeyword: '名古屋 SNSマーケティング 仕事',
      reachKeyword: 'SNSマーケティングの特徴',
      searchIntent: 'SNSに関わる求人を見て興味を持ったが、運用・採用・ディレクター・営業の違いが分からず、自分の経験で挑戦できるのか不安になり、仕事内容・適性・働き方・給与・会社選びを整理して転職判断したい。',
      targetAudience: '名古屋市・愛知県で転職を考える20代〜30代。SNSを仕事にしたい一方、華やかな印象だけで転職して後悔したくないと感じ、仕事内容からキャリアまで整理して応募判断したい人。',
      conclusion: 'SNSマーケティングの仕事は投稿作業だけでなく、企業課題ヒアリング、企画、動画制作、運用、分析、改善、採用、営業まで幅広い。6つの判断軸を整理すれば自分に合う職種と会社が見える。',
      uniquePoint: 'SNSマーケティング職への転職判断に必要な6つの意思決定軸を統合する唯一の全体記事。',
      suggestKeywords: 'SNSマーケティングの特徴, SNSマーケティングの種類',
      status: 'pending',
    },
    {
      id: 'row-2',
      day: '2',
      role: '準親',
      category: '職種選択判断',
      mainKeyword: '名古屋 SNSマーケティング 仕事内容',
      reachKeyword: 'SNSマーケティングの種類',
      searchIntent: '求人票に企画・撮影・分析・営業など多くの業務が書かれていて戸惑い、SNSディレクター・採用ディレクター・営業・動画制作の役割を整理して自分に合う職種を選びたい。',
      targetAudience: '名古屋市でSNS関連求人を探し始めた20代〜30代。結局自分は何を担当するのか違和感を持ち、役割分担を理解したい人。',
      conclusion: 'SNSディレクター（進行・企画）、採用ディレクター（採用課題解決）、動画編集（制作）、法人営業（提案）など役割が分かれている。「つくる・進める・提案する」のどこに強みを持つかで選ぶ。',
      uniquePoint: 'SNSマーケティングに関わる職種全体の担当範囲と役割分担の整理だけに特化。',
      suggestKeywords: 'SNSマーケティングの種類, 職種別の違い',
      status: 'pending',
    },
    {
      id: 'row-3',
      day: '3',
      role: '準親',
      category: '未経験・適性判断',
      mainKeyword: '名古屋 SNSマーケティング 未経験',
      reachKeyword: 'SNSマーケティングはどんな人に向いている？',
      searchIntent: '未経験歓迎の求人を見たが、普段SNSを使う程度で通用するのか不安。活かせる前職経験や必要な適性を整理して挑戦すべきか判断したい。',
      targetAudience: '異業種（営業・接客・事務など）からSNS業界へ転職を考える20代〜30代。未経験でもついていけるか不安な人。',
      conclusion: '未経験でも挑戦可能だが、SNSへの興味だけでなく段取り力、顧客対応、質問力、好奇心が重要。既存の接客や事務の経験をどう活かせるか整理すると判断しやすい。',
      uniquePoint: 'SNSマーケティングへ未経験から挑戦できるかという適性判断全体に特化。',
      suggestKeywords: '未経験適性, 向いている人',
      status: 'pending',
    },
  ],
  'client-clinic': [
    {
      id: 'row-c1',
      day: '1',
      role: '親',
      category: '症状・治療理解',
      mainKeyword: 'ピコレーザー ダウンタイム 経過',
      reachKeyword: 'ピコトーニング ダウンタイム 赤み',
      searchIntent: 'ピコレーザー施術後の赤みやかさぶたが何日続くか不安で、仕事や予定に影響がないか確認したい。',
      targetAudience: '初めてピコレーザー治療を検討している20代〜40代。ダウンタイムの期間やメイク再開の目安を知りたい人。',
      conclusion: 'ピコレーザーは熱ダメージが少なく、トーニングなら数時間〜翌日の赤み、スポット照射なら3〜7日程度のかさぶたで経過する。紫外線対策と保湿が重要。',
      uniquePoint: 'ピコレーザーの照射モード別（トーニング・スポット・フラクショナル）のダウンタイム経過と過ごし方の客観的比較。',
      suggestKeywords: 'ダウンタイム日数, メイク再開',
      status: 'pending',
    },
  ],
};

const STORAGE_KEYS = {
  CLIENTS: 'm8blog_clients_v2',
  KNOWLEDGES: 'm8blog_knowledges_v2',
  PROMPTS: 'm8blog_prompts_v2',
  SHEET_ROWS: 'm8blog_sheet_rows_v2',
  DRAFTS: 'm8blog_drafts_v2',
  API_KEY: 'm8blog_anthropic_api_key_v2',
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
      return all.filter((k) => k.clientId === clientId);
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

  getSheetRows(clientId: string): KeywordSheetRow[] {
    if (typeof window === 'undefined') return INITIAL_SHEET_ROWS[clientId] || [];
    const data = localStorage.getItem(`${STORAGE_KEYS.SHEET_ROWS}_${clientId}`);
    if (!data) {
      const initial = INITIAL_SHEET_ROWS[clientId] || [];
      localStorage.setItem(`${STORAGE_KEYS.SHEET_ROWS}_${clientId}`, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },

  saveSheetRows(clientId: string, rows: KeywordSheetRow[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_KEYS.SHEET_ROWS}_${clientId}`, JSON.stringify(rows));
  },

  getDrafts(clientId?: string): BlogDraft[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.DRAFTS);
    const drafts: BlogDraft[] = data ? JSON.parse(data) : [];
    if (clientId) {
      return drafts.filter((d) => d.clientId === clientId);
    }
    return drafts;
  },

  saveDraft(draft: BlogDraft) {
    if (typeof window === 'undefined') return;
    const drafts = this.getDrafts();
    const index = drafts.findIndex((d) => d.id === draft.id);
    if (index >= 0) {
      drafts[index] = draft;
    } else {
      drafts.unshift(draft);
    }
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
  },

  deleteDraft(id: string) {
    if (typeof window === 'undefined') return;
    const drafts = this.getDrafts().filter((d) => d.id !== id);
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
