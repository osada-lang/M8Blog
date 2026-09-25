import { BlogDraft, Client, KeywordHistoryItem, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { DEFAULT_PROMPT_TEMPLATES } from './defaultPrompts';

// 初期クライアント（株式会社PAQLAのみ）
export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-paqla',
    name: '株式会社PAQLA',
    industry: '映像制作・企業PR・動画マーケティング',
    promptType: 'general',
    description: 'テレビマンの取材力と構成力を活かし企業の伝わらない価値を翻訳・映像化する制作会社',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1l3dNgqGDHr4AB2MDMcVXDh_iIXIWOQgI/edit?gid=1995381802#gid=1995381802',
    documentUrl: 'https://docs.google.com/document/d/1SNA7FucNNLtYz4SLHhoEQUhmHQWsckf9/edit',
    hearingSheetUrl: 'https://docs.google.com/document/d/1nXfhf0iNODwVw1SmP_5nwwevd2v68jsr/edit#heading=h.zc78x63hcval',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const PAQLA_DOC = `以下、動画マーケティングの歴史を、映画・テレビの前史から、YouTube、モバイル、短尺動画、クリエイター経済までを通して、文献ベースで約1万文字規模で整理して要約します。単なる年表ではなく、「何が変わったのか」「なぜ動画がマーケティングの中心に近づいたのか」という流れが見えるようにまとめます。 
________________

動画マーケティングの歴史的文献要約
動画マーケティングの歴史は、単に「動画広告が増えた歴史」ではない。より正確には、動く映像が、商品説明・ブランド形成・購買誘導・コミュニティ形成・販売接点の統合にまで役割を広げてきた歴史である。今日の私たちは、YouTube広告、TikTok、Instagram Reels、企業の採用動画、商品比較動画、レビュー動画、ライブコマース動画を同じ「動画マーケティング」と呼んでいるが、歴史的にはそれらは異なる段階を経て接続されてきた。文献を通覧すると、この発展は大きく、①映画・テレビ時代の一方向型映像訴求、②インターネット初期の配信技術の整備、③動画共有プラットフォームの登場、④広告配信標準化とデータ計測の確立、⑤スマートフォンとSNSによる日常化、⑥短尺化・クリエイター化・コマース化、という流れで理解できる。 

1. 前史：映画宣伝とテレビCMの時代
動画マーケティングの原型は、インターネットではなく、映画と放送の時代にある。映画産業の初期広告研究では、1915年以前の映画広告やポスターがすでに「印象的な場面を切り出し、観客の注意を引き、鑑賞行動へ誘導する」構造を持っていたことが指摘されている。つまり、動画マーケティング以前に、映像コンテンツそのものを“見たい”と思わせる宣伝技法が成立していた。これは現代のサムネイル、ティザー、トレーラー、切り抜き動画の祖型として読むことができる。
その後、テレビが20世紀半ばまでに大衆的な放送メディアとして定着すると、映像は広告の中心的な器になった。テレビは音声中心の訴求から、視覚・演出・人物表現を組み合わせた訴求へ移行し、生活者の家庭内視聴習慣に入り込み、感情移入と記憶形成を強く担う媒体になった。

2. インターネット初期：オンライン広告から動画配信基盤へ
1990年代後半から2000年代初頭にかけて、動画は「放送設備を持つ事業者の専有物」から、「インターネット上で流通・販売・計測できる広告資産」へ変わり始めた。さらに利用者自身もコンテンツを作り、共有し、反応する時代へ移った。

3. プラットフォーム革命：YouTubeが変えたもの
2005年のYouTube登場により、動画はアーカイブ化され、検索され、後から見られ、関連動画で再発見されるマーケティング資産になった。

4. 標準化と計測：動画広告が産業として整った時代
VAST（Video Ad Serving Template）等により配信規格が整い、効果計測と改善が可能な産業へと進化した。

5. スマートフォンとSNS：動画の日常化と垂直統合
スマートフォン世帯保有率が9割を超え、動画は「わざわざ見るもの」から「日常の中で流れてくるもの」へ変化した。

6. 現代：短尺動画・クリエイター経済・コマースの融合
TikTokやリールなどの縦型ショート動画が普及し、認知から購買・応募までの導線がシームレスに統合されている。`;

const PAQLA_HEARING = `【株式会社PAQLA 基本情報・実績・代表者の想い】

【1. 実績・所属・資格】
・年間映像制作数: 100本以上
・プロデュースYouTubeチャンネル: 「やさなご放送局」（2026年5月現在 登録者数28万人突破）
・所属: 名古屋商工会議所、名古屋市ブランドパートナー認定
・資格: 社員1名が「屋外広告士」を保有（デジタルサイネージの設置や景観法令を踏まえた専門的助言が可能）

【2. 代表者の経歴】
名古屋学芸大学メディア造形学部映像メディア学科卒業。
大学時代から中日新聞社校閲、東海ラジオ、CATV、テレビ愛知の報道部等でアシスタント・ディレクターを務める。
2019年5月に株式会社PAQLAを設立。愛知県よろず支援拠点外部講師、中小企業119専門家等に就任。

【3. 仕事への想い・”翻訳者”としての哲学】
・「テレビマンとは、難しいテーマを小学3年生にもわかるように伝える”翻訳者”である」
ディレクター自身が心底”理解”するまで徹底的に「取材」を重ね、物事の本質を探り、それを噛み砕いてビジュアル化・言語化することがPAQLAの最大の強み。
・「映像制作の根底は取材にあり」
営業でのサービス説明、難しい商品の使い方、表現しづらい企業理念などを、顧客に伝わる形へ翻訳する。

【4. 女性クリエイター支援と働きやすい環境づくり】
平日日中で完結する現場体制を整え、独立を考える女性クリエイターへの研修・相談会を実施。仲間の制作会社と協定を結び、助け合えるバックアップ体制を構築。

【5. 地域貢献・教育コンテンツ】
名古屋市ブランドパートナーとして「やさなご放送局」を立ち上げ、名古屋市の魅力発信と地域課題解決に貢献。キャラクターを用いた子ども向け教育コンテンツ（交通安全・防災・健康）も展開。
会社HP: https://paqla.co.jp/`;

export const INITIAL_KNOWLEDGES: KnowledgeItem[] = [
  {
    id: 'know-paqla-doc',
    clientId: 'client-paqla',
    title: '株式会社PAQLA 文献要約集（動画マーケティング史・テレビからデジタル動画への変遷）',
    sourceType: 'text',
    content: PAQLA_DOC,
    tags: ['PAQLA文献要約', '動画マーケティング史', 'テレビと動画広告'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'know-paqla-hearing',
    clientId: 'client-paqla',
    title: '株式会社PAQLA ヒアリングシート（代表経歴・翻訳者哲学・取材力・実績）',
    sourceType: 'text',
    content: PAQLA_HEARING,
    tags: ['PAQLAヒアリングシート', '代表経歴', 'テレビマンの翻訳技術', '取材力'],
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_SHEET_ROWS: Record<string, KeywordSheetRow[]> = {
  'client-paqla': [
    {
      id: 'paqla-row-1',
      day: '1',
      role: '孫',
      category: '強み・伝える内容の整理判断',
      kwType: 'reach',
      mainKeyword: '自社の強み わからない',
      reachKeyword: '自社の強み わからない',
      searchIntent: '会社案内や営業資料を作ろうとしても自社の強みを「品質」「対応力」程度しか言葉にできず、競合との違い・顧客から評価される理由を整理したい。',
      targetAudience: '名古屋・愛知の中小企業経営者・広報担当者で、他社と似た表現しか出てこず、自社の強みをどう見つけるか判断したくて検索している人。',
      conclusion: '自社の強みは抽象語を考えるのではなく、顧客に選ばれた理由、現場で続けている工夫を具体化すると見つけやすい。第三者の取材を使って整理する方法も有効。',
      uniquePoint: '自社の強みを「新しく作る」のではなく既存の事実から発見する判断に特化。',
      suggestKeywords: '自社の強みの種類',
    },
    {
      id: 'paqla-row-2',
      day: '2',
      role: '孫',
      category: '取材・ヒアリング方法判断',
      kwType: 'reach',
      mainKeyword: 'PAQLA 取材力',
      reachKeyword: 'PAQLA 取材力',
      searchIntent: 'PAQLAが取材を重視すると知ったものの一般的な制作会社のヒアリングと何が違うのか疑問を持ち、自社の説明しづらい価値を任せる相手として合うか判断したい。',
      targetAudience: '名古屋・愛知で企業PRを検討する経営者・広報担当者で、PAQLAの「映像制作の根底は取材にあり」という考えに関心を持った人。',
      conclusion: 'PAQLAが重視する取材は、制作側が事業を理解できるまで話を聞き、本質や伝えるべき価値を掘り起こして表現へつなげる工程。説明しづらい事業ほど相性が良い。',
      uniquePoint: 'PAQLA固有の「取材」の意味と通常の事前ヒアリングとの違いに特化。',
      suggestKeywords: 'PAQLAの特徴',
    },
    {
      id: 'paqla-row-3',
      day: '3',
      role: '孫',
      category: '言語化・説明設計判断',
      kwType: 'reach',
      mainKeyword: '専門サービス わかりやすく説明',
      reachKeyword: '専門サービス わかりやすく説明',
      searchIntent: '自社では当たり前の専門用語を使ってサービスを説明したところ顧客から理解されず、どこまで情報を噛み砕けば正確さを失わず伝わるのか判断したい。',
      targetAudience: '製造業・IT・士業・専門サービスを扱う経営者や営業担当者で、顧客から「結局何をしてくれるのですか」と聞かれて悩んでいる人。',
      conclusion: '専門サービスは専門用語を削るだけでなく、「誰のどんな課題を、何によって、どう変えるのか」の順で組み替えると理解されやすい。',
      uniquePoint: '専門用語が多いサービスを顧客が理解できる言葉へ変換する方法に特化。',
      suggestKeywords: 'サービス説明の使い方／手順',
    },
    {
      id: 'paqla-row-4',
      day: '4',
      role: '孫',
      category: '構成・映像化方法判断',
      kwType: 'reach',
      mainKeyword: '会社紹介動画 失敗',
      reachKeyword: '会社紹介動画 失敗',
      searchIntent: '会社紹介動画を作ろうとして情報をすべて入れたくなり、情報過多でまとまりのない映像になるのではと心配し、撮影前に何を残し何を削るか判断したい。',
      targetAudience: '初めて会社紹介動画を担当する広報・採用担当者で、各部署からの要望が多く失敗を避けたい人。',
      conclusion: '会社紹介動画の失敗は「誰に何を伝える動画か」が曖昧なまま情報を詰め込むことで起こる。視聴者と結論を一つ決め、それに必要な情報だけを残すことが重要。',
      uniquePoint: '会社紹介動画で情報を詰め込みすぎる失敗だけに特化。',
      suggestKeywords: '会社紹介動画 失敗原因',
    },
    {
      id: 'paqla-row-5',
      day: '5',
      role: '孫',
      category: '外注・制作体制判断',
      kwType: 'reach',
      mainKeyword: 'PAQLA 動画制作 相談',
      reachKeyword: 'PAQLA 動画制作 相談',
      searchIntent: 'PAQLAへの相談を検討しているものの、企画や台本が決まっていない状態で問い合わせてよいのか迷い、相談タイミングを確認したい。',
      targetAudience: '動画を作りたい目的はあるものの内容を決められず、「何も決めず相談して大丈夫か」と不安な企業担当者。',
      conclusion: 'PAQLAは取材によって内容を理解し言語化・構成へつなげるため、完成した企画や台本がなくても相談可能。誰に何が伝わっていないかだけでも整理しておくとスムーズ。',
      uniquePoint: '企画未確定の状態でPAQLAへ相談できるかという指名検索に特化。',
      suggestKeywords: 'PAQLAのよくある質問',
    },
    {
      id: 'paqla-row-6',
      day: '6',
      role: '孫',
      category: '地域発信・信頼性判断',
      kwType: 'reach',
      mainKeyword: '名古屋 企業PR 地域性',
      reachKeyword: '名古屋 企業PR 地域性',
      searchIntent: '全国向けに作った企業紹介では地元からの反応が弱く、地域での活動や接点をどう情報発信へ反映するか判断したい。',
      targetAudience: '名古屋市・愛知県の中小企業経営者や広報担当者で、地元企業として何を発信すべきか迷っている人。',
      conclusion: '地域企業のPRでは所在地だけでなく、「地域で誰と関わり、どのような活動をし、どんな価値を生み出しているか」を具体化することで地域性が伝わる。',
      uniquePoint: '企業PRにおける「名古屋らしさ」の作り方ではなく地域との実際の接点整理に特化。',
      suggestKeywords: '企業PRは地域でどう違う？',
    },
    {
      id: 'paqla-row-7',
      day: '7',
      role: '孫',
      category: '強み・伝える内容の整理判断',
      kwType: 'reach',
      mainKeyword: '企業理念 伝え方',
      reachKeyword: '企業理念 伝え方',
      searchIntent: '企業理念をWebサイトや動画に載せても抽象的で意味が伝わらず、具体的な行動やエピソードで伝える方法を知りたい。',
      targetAudience: '理念を掲載しても反応がなく、言葉だけが独り歩きしていると感じている経営者・広報担当者。',
      conclusion: '企業理念は理念文を言い換えるだけでなく、その考え方が生まれた背景、実際の判断、社員の行動と結びつけることで理解される。取材による具体化が有効。',
      uniquePoint: '抽象的な企業理念を具体的な行動・経験へ落とし込む判断に特化。',
      suggestKeywords: '企業理念のリアルな体験談',
    },
    {
      id: 'paqla-row-8',
      day: '8',
      role: '孫',
      category: '取材・ヒアリング方法判断',
      kwType: 'reach',
      mainKeyword: '社員インタビュー 難しい',
      reachKeyword: '社員インタビュー 難しい',
      searchIntent: '社員インタビューを任されたものの、質問を用意しても会話が広がらず、本音や具体的な経験をどう引き出せばよいか分からない。',
      targetAudience: '採用動画や社員紹介を担当する人事・広報担当者で、インタビューの進め方に悩んでいる人。',
      conclusion: '社員インタビューが難しいのは質問数が少ないからではなく、回答を受けて具体的な経験まで深掘りする必要があるため。目的を整理し、理解しながら追加質問を重ねることが重要。',
      uniquePoint: '社員インタビューを初めて担当した人が「なぜ難しいのか」を理解し、進行方法を判断する記事に特化。',
      suggestKeywords: '社員インタビュー よくある誤解',
    },
    {
      id: 'paqla-row-9',
      day: '9',
      role: '孫',
      category: '言語化・説明設計判断',
      kwType: 'reach',
      mainKeyword: 'PAQLA 翻訳者',
      reachKeyword: 'PAQLA 翻訳者',
      searchIntent: 'PAQLAが自らを「翻訳者」と捉えていることを知り、その考え方が企業のサービス説明や理念表現にどう使われるのか知りたい。',
      targetAudience: '「テレビマンは翻訳者」という表現に関心を持ち、自社の課題に合う支援か判断したい経営者・広報担当者。',
      conclusion: 'PAQLAが言う「翻訳者」とは、企業自身でも説明しづらい専門価値を徹底的な取材で理解し、小学3年生にもわかる言葉と映像へ変換する技術のこと。',
      uniquePoint: 'PAQLAが掲げる「テレビマンは翻訳者」という思想の実践方法に特化。',
      suggestKeywords: 'PAQLAの企業理念',
    },
  ],
};

const STORAGE_KEYS = {
  CLIENTS: 'm8blog_clients_v10',
  KNOWLEDGES: 'm8blog_knowledges_v10',
  PROMPTS: 'm8blog_prompts_v10',
  SHEET_ROWS: 'm8blog_sheet_rows_v10',
  HISTORY: 'm8blog_history_v10',
  API_KEY: 'm8blog_anthropic_api_key_v10',
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
    const data = localStorage.getItem(STORAGE_KEYS.SHEET_ROWS + '_' + clientId);
    if (!data) {
      const initial = INITIAL_SHEET_ROWS[clientId] || [];
      localStorage.setItem(STORAGE_KEYS.SHEET_ROWS + '_' + clientId, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },

  saveSheetRows(clientId: string, rows: KeywordSheetRow[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SHEET_ROWS + '_' + clientId, JSON.stringify(rows));
  },

  getHistory(clientId: string): KeywordHistoryItem[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY + '_' + clientId);
    return data ? JSON.parse(data) : [];
  },

  addHistoryItem(item: KeywordHistoryItem) {
    if (typeof window === 'undefined') return;
    const history = this.getHistory(item.clientId);
    const filtered = history.filter((h) => h.keyword !== item.keyword);
    filtered.unshift(item);
    localStorage.setItem(STORAGE_KEYS.HISTORY + '_' + item.clientId, JSON.stringify(filtered.slice(0, 100)));
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
