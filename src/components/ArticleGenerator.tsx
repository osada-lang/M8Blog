'use client';

import React, { useState } from 'react';
import { BlogDraft, Client, GenerateArticleRequest, KnowledgeItem, PromptTemplate } from '@/types';
import { Sparkles, Loader2, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

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

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgressText, setCurrentProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const clientKnowledges = knowledges.filter((k) => k.clientId === client.id);
  const activePrompt = prompts.find((p) => p.type === client.promptType) || prompts[0];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsGenerating(true);
    setErrorMsg('');
    setCurrentProgressText('頭脳ナレッジを照合中...');

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

      setCurrentProgressText('Claude 3.5 Sonnet で執筆中...');

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

      setCurrentProgressText('ファクトチェック完了！');

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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ヒーローカード */}
      <div className="apple-card p-8 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#f5f5f7] border border-[#e5e5ea] flex items-center justify-center text-[#0066cc]">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
          ブログ下書きを生成する
        </h1>
        <p className="text-sm text-[#86868b] max-w-lg mx-auto">
          設定されたキーワードと「{client.name}」の頭脳（{clientKnowledges.length}件の資料）をもとに、Claude 3.5 Sonnet がLLMO最適化された記事を執筆します。
        </p>

        {/* 適用モードバッジ */}
        <div className="pt-2 flex items-center justify-center space-x-3 text-xs">
          {client.promptType === 'medical' ? (
            <span className="inline-flex items-center text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full font-medium">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600" />
              医療系モード（薬機法ガード ＆ 免責事項付与）
            </span>
          ) : (
            <span className="inline-flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              普通モード（店舗・一般企業LLMO）
            </span>
          )}
          <span className="text-[#86868b]">
            参照資料: {clientKnowledges.length > 0 ? `${clientKnowledges.length}件` : '未登録（汎用生成）'}
          </span>
        </div>
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleGenerate} className="apple-card p-8 space-y-6">
        {/* メインキーワード */}
        <div>
          <label className="text-xs font-semibold text-[#1d1d1f] block mb-2">
            メインキーワード <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder={
              client.promptType === 'medical'
                ? '例: ピコレーザー ダウンタイム 期間'
                : '例: iPhone 画面割れ 即日修理 渋谷'
            }
            className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-4 py-3 text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 transition"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
          />
        </div>

        {/* サブキーワード */}
        <div>
          <label className="text-xs font-semibold text-[#1d1d1f] block mb-2">
            関連サブキーワード（カンマ区切り / 任意）
          </label>
          <input
            type="text"
            placeholder="例: 費用, 痛み, カウンセリング, 当日予約"
            className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 transition"
            value={subKeywordsInput}
            onChange={(e) => setSubKeywordsInput(e.target.value)}
          />
        </div>

        {/* ターゲット & 目安文字数 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-2">
              ターゲット読者・ペルソナ
            </label>
            <input
              type="text"
              placeholder="例: 初めて美容医療を検討している20〜30代女性"
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 transition"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-2">
              目安文字数
            </label>
            <select
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 transition cursor-pointer"
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

        {/* 追加指示 */}
        <div>
          <label className="text-xs font-semibold text-[#1d1d1f] block mb-2">
            追加の執筆指示（任意）
          </label>
          <textarea
            rows={2}
            placeholder="例: 「よくある質問」の項目を多めにしてほしい、当院独自のカウンセリングの流れを強調してほしい等"
            className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl p-3 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 transition"
            value={customOverride}
            onChange={(e) => setCustomOverride(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Apple Action Blue ピルボタン */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isGenerating || !keyword.trim()}
            className="apple-pill-btn w-full py-3.5 px-6 text-sm font-semibold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{currentProgressText || '記事を生成中...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>下書きを生成 ＆ ファクトチェックを実行</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
