'use client';

import React, { useState } from 'react';
import { BlogDraft, Client, GenerateArticleRequest, KnowledgeItem, PromptTemplate } from '@/types';
import { Sparkles, Loader2, FileText, ListOrdered, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ArticleGeneratorProps {
  client: Client;
  knowledges: KnowledgeItem[];
  prompts: PromptTemplate[];
  apiKey: string;
  onGenerateSuccess: (draft: BlogDraft) => void;
}

export const ArticleGenerator: React.FC<ArticleGeneratorProps> = ({
  client,
  knowledges,
  prompts,
  apiKey,
  onGenerateSuccess,
}) => {
  const [keyword, setKeyword] = useState('');
  const [subKeywordsInput, setSubKeywordsInput] = useState('');
  const [targetAudience, setTargetAudience] = useState(client.targetAudience || '');
  const [wordCountTarget, setWordCountTarget] = useState(2500);
  const [customOverride, setCustomOverride] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgressText, setCurrentProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const clientKnowledges = knowledges.filter((k) => k.clientId === client.id);
  const activePrompt = prompts.find((p) => p.type === client.promptType) || prompts[0];

  // 単発生成ハンドラ
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsGenerating(true);
    setErrorMsg('');
    setCurrentProgressText('クライアント頭脳から関連資料を検索中 (RAG)...');

    try {
      const subKeywords = subKeywordsInput
        .split(/[,、\s]+/)
        .map((k) => k.trim())
        .filter(Boolean);

      const reqBody: GenerateArticleRequest = {
        clientId: client.id,
        keyword: keyword.trim(),
        subKeywords,
        promptType: client.promptType,
        targetAudience,
        wordCountTarget,
        customPromptOverride: customOverride,
        apiKey,
      };

      setCurrentProgressText('Claude 3.5 Sonnet でブログ下書きを生成中...');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          knowledges: clientKnowledges,
          promptTemplate: activePrompt,
          generateRequest: reqBody,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '生成に失敗しました');

      setCurrentProgressText('ハルシネーション＆薬機法ファクトチェック完了！');

      const draft: BlogDraft = {
        id: `draft-${Date.now()}`,
        clientId: client.id,
        keyword: keyword.trim(),
        subKeywords,
        promptType: client.promptType,
        title: json.data.title,
        contentMarkdown: json.data.contentMarkdown,
        metaDescription: json.data.metaDescription,
        suggestedTags: json.data.suggestedTags,
        usedKnowledgeIds: json.data.usedKnowledgeIds,
        factCheck: json.data.factCheck,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onGenerateSuccess(draft);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsGenerating(false);
      setCurrentProgressText('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 上部カード */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">キーワードからブログ下書きを生成</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              設定されたキーワードと「{client.name}」の頭脳（{clientKnowledges.length}件の資料）を掛け合わせ、LLMO対策済みの記事を執筆します。
            </p>
          </div>
        </div>

        {/* モード表示バッジ */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">適用プロンプト:</span>
            {client.promptType === 'medical' ? (
              <span className="flex items-center text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded font-medium">
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                医療系モード（薬機法ガード＆免責事項付き）
              </span>
            ) : (
              <span className="flex items-center text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                普通モード（店舗・一般企業LLMO）
              </span>
            )}
          </div>
          <span className="text-slate-400 font-mono">
            参照頭脳: {clientKnowledges.length > 0 ? `${clientKnowledges.length}件利用可能` : '登録なし(汎用生成)'}
          </span>
        </div>
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleGenerate} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        {/* メインキーワード */}
        <div>
          <label className="text-xs font-semibold text-slate-200 block mb-1.5">
            メインキーワード <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder={
              client.promptType === 'medical'
                ? '例: ピコレーザー ダウンタイム 期間'
                : '例: iPhone 画面割れ 即日修理 渋谷'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
          />
        </div>

        {/* サブキーワード */}
        <div>
          <label className="text-xs font-semibold text-slate-200 block mb-1.5">
            関連サブキーワード（カンマ区切り / 任意）
          </label>
          <input
            type="text"
            placeholder="例: 費用, 痛み, カウンセリング, 当日予約"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            value={subKeywordsInput}
            onChange={(e) => setSubKeywordsInput(e.target.value)}
          />
        </div>

        {/* ターゲット読者 & 目安文字数 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1.5">
              ターゲット読者・ペルソナ
            </label>
            <input
              type="text"
              placeholder="例: 初めて美容医療を検討している20〜30代女性"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1.5">
              目安文字数（約 {wordCountTarget} 文字）
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              value={wordCountTarget}
              onChange={(e) => setWordCountTarget(Number(e.target.value))}
            >
              <option value={1500}>約 1,500 文字 (コンパクト解説)</option>
              <option value={2000}>約 2,000 文字 (標準ブログ)</option>
              <option value={2500}>約 2,500 文字 (網羅的・LLMO推奨)</option>
              <option value={3500}>約 3,500 文字 (徹底解説・ピラー記事)</option>
            </select>
          </div>
        </div>

        {/* 追加のカスタム指示 */}
        <div>
          <label className="text-xs font-semibold text-slate-200 block mb-1.5">
            追加の執筆指示（任意）
          </label>
          <textarea
            rows={2}
            placeholder="例: 「よくある質問」の項目を多めにしてほしい、当院独自のカウンセリングの流れを強調してほしい等"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            value={customOverride}
            onChange={(e) => setCustomOverride(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* 生成ボタン & プログレス表示 */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isGenerating || !keyword.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{currentProgressText || '記事を生成中...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Claude 3.5 Sonnet で下書き ＆ ファクトチェック実行</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
