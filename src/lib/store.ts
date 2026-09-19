import { BlogDraft, Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { DEFAULT_PROMPT_TEMPLATES } from './defaultPrompts';

// 初期クライアント（スプシURL ＆ ドキュメントURL完備）
export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-senisuru',
    name: '株式会社セニスル',
    industry: 'SNSマーケティング・採用支援',
    promptType: 'general',
    description: '名古屋を拠点に企業のSNS運用・動画制作・採用ブランディングを支援',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1hIvLlX5Ba_5WHZNAU73KA82v5p01UIgK8qepnLj98Vc/edit?gid=1811296889#gid=1811296889',
    documentUrl: 'https://docs.google.com/document/d/1Z_mfnLt9gig-yqQIaqYuUO1DsBhdGd43uLXtfMwP1k0/edit?tab=t.0#heading=h.rkpgm39icgi8',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'client-clinic',
    name: '表参道スキンケアクリニック',
    industry: '美容皮膚科・エイジングケア',
    promptType: 'medical',
    description: 'ピコレーザーや肌診断に基づくパーソナライズ治療',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1hIvLlX5Ba_5WHZNAU73KA82v5p01UIgK8qepnLj98Vc/edit?gid=1811296889#gid=1811296889',
    documentUrl: 'https://docs.google.com/document/d/1Z_mfnLt9gig-yqQIaqYuUO1DsBhdGd43uLXtfMwP1k0/edit?tab=t.0#heading=h.rkpgm39icgi8',
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
];

// 孫記事キーワード一覧（スプレッドシートのB列＝「孫」の全行）
export const INITIAL_SHEET_ROWS: Record<string, KeywordSheetRow[]> = {
  'client-senisuru': [
    {
      id: 'row-8',
      day: '8',
      role: '孫',
      category: '仕事内容・職種選択判断',
      mainKeyword: 'SNSディレクター 動画編集 違い',
      reachKeyword: 'SNSディレクターと動画編集者の違い',
      searchIntent: 'SNS関連求人を見てSNSディレクターと動画編集者の両方に興味を持ったが、どちらも動画を扱うため違いが分からず、自分が編集作業を中心にしたいのか、企画・撮影・顧客対応まで担いたいのか整理して応募職種を判断したい。',
      targetAudience: '名古屋市でSNS求人を探す20代〜30代。動画を仕事にしたい一方、裏方で制作に集中したいのか、人と関わり企画から動かしたいのか迷っている人。',
      conclusion: '動画編集は「映像を形にする制作特化職」、SNSディレクターは「企画・撮影・顧客対応・改善まで担う進行管理職」。自分が制作に集中したいか全体を動かしたいかで選ぶ。',
      uniquePoint: '動画編集とSNSディレクターの業務範囲・適性・キャリアの差だけに特化した比較記事。',
      suggestKeywords: 'SNSディレクター 動画編集 違い, 業務範囲の違い',
    },
    {
      id: 'row-9',
      day: '9',
      role: '孫',
      category: '仕事内容・職種選択判断',
      mainKeyword: '採用ディレクター SNS運用 違い',
      reachKeyword: '採用ディレクターとSNS運用担当の違い',
      searchIntent: 'SNS運用の求人と採用ディレクターの求人の違いが分からず、再生数を伸ばす仕事と採用課題を解決する仕事の違いを整理して判断したい。',
      targetAudience: '企業の採用支援やSNS活用に興味を持つ20代〜30代。単なるSNS投稿ではなく採用成果に関わりたい人。',
      conclusion: '一般的なSNS運用は「認知・集客・再生数」を目的とし、採用ディレクターは「母集団形成・企業理解・応募獲得」という採用成果を目的とする。',
      uniquePoint: '目的が「集客」か「採用」かによるディレクション業務の本質的な違いに特化。',
      suggestKeywords: '採用ディレクター SNS運用 違い, 採用SNSの特徴',
    },
    {
      id: 'row-10',
      day: '10',
      role: '孫',
      category: '未経験・適性判断',
      mainKeyword: 'SNSマーケティング 接客 経験 活かせる',
      reachKeyword: '接客業からSNSマーケティングへの転職',
      searchIntent: 'アパレルや飲食などの接客経験しかないが、SNSマーケティングへ転職できるか不安。活かせるスキルや強みを整理したい。',
      targetAudience: '接客・販売・サービス業からSNS業界への転職を検討している20代。専門スキルがないと諦めかけている人。',
      conclusion: '接客で培った「顧客の意図を汲み取る力」「丁寧なコミュニケーション」「トレンドへの敏感さ」は、SNSの企画やクライアント対応に直結する大きな強みになる。',
      uniquePoint: '接客業の経験がSNSマーケティングの現場でどう武器になるかという具体例に特化。',
      suggestKeywords: '接客経験 転職 SNS, 未経験強み',
    },
    {
      id: 'row-11',
      day: '11',
      role: '孫',
      category: '未経験・適性判断',
      mainKeyword: 'SNSマーケティング 営業 経験 活かせる',
      reachKeyword: '営業職からSNSマーケティングへの転職',
      searchIntent: '法人営業や個人営業の経験をSNSマーケティングでどう活かせるか、提案力や折衝力が武器になるのか確認したい。',
      targetAudience: '営業職からマーケティング領域へのキャリアチェンジを検討している20代〜30代。',
      conclusion: '営業で培った「課題ヒアリング力」「数値目標へのコミット力」「提案力」は、SNS運用におけるクライアント提案や分析改善で最大の強みになる。',
      uniquePoint: '営業経験者のスキルがSNSマーケティング職で即戦力化する理由に特化。',
      suggestKeywords: '営業経験 マーケティング転職, 提案力',
    },
    {
      id: 'row-12',
      day: '12',
      role: '孫',
      category: '働き方・両立判断',
      mainKeyword: 'SNSディレクター リモート 在宅 勤務',
      reachKeyword: 'SNSディレクターの在宅勤務実態',
      searchIntent: 'SNSディレクターはフルリモートで働けるのか、撮影や顧客対応での出社頻度はどのくらいか実態を知りたい。',
      targetAudience: '在宅勤務や柔軟な働き方を希望してSNS業界への転職を考える求職者。',
      conclusion: '企画・構成・分析はリモート可能だが、クライアント先での撮影や対面打ち合わせなど外出・出社が必要な場面もある。制度と実態のバランスが重要。',
      uniquePoint: 'SNSディレクターにおけるリモートと現場出社のリアルな割合・運用実態に特化。',
      suggestKeywords: 'リモートワーク実態, 出社頻度',
    },
  ],
  'client-clinic': [
    {
      id: 'row-c1',
      day: '1',
      role: '孫',
      category: '症状・治療理解',
      mainKeyword: 'ピコトーニング ダウンタイム 経過 赤み',
      reachKeyword: 'ピコトーニング 翌日の赤み メイク',
      searchIntent: 'ピコトーニング照射後の赤みが何時間で引くのか、翌日の仕事やメイクに支障がないか確認したい。',
      targetAudience: '初めてピコトーニングを受ける20代〜40代女性。ダウンタイムの具体的な経過を知りたい人。',
      conclusion: 'ピコトーニングは熱ダメージが少なく、赤みは数時間〜翌日には落ち着くケースがほとんど。当日からミネラルメイク可能。',
      uniquePoint: 'ピコトーニング特有のダウンタイム経過と翌日の過ごし方・注意点に特化。',
      suggestKeywords: 'ピコトーニング 赤み 経過, 翌日メイク',
    },
  ],
};

const STORAGE_KEYS = {
  CLIENTS: 'm8blog_clients_v4',
  KNOWLEDGES: 'm8blog_knowledges_v4',
  PROMPTS: 'm8blog_prompts_v4',
  SHEET_ROWS: 'm8blog_sheet_rows_v4',
  API_KEY: 'm8blog_anthropic_api_key_v4',
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

  getApiKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  saveApiKey(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  },
};
