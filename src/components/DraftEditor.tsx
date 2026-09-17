'use client';

import React, { useState } from 'react';
import { BlogDraft, FactCheckIssue, KnowledgeItem } from '@/types';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  FileEdit, 
  Eye, 
  HelpCircle,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface DraftEditorProps {
  draft: BlogDraft;
  knowledges: KnowledgeItem[];
  onUpdateDraft: (updated: BlogDraft) => void;
  onRecheckFact?: () => void;
  isRechecking?: boolean;
}

export const DraftEditor: React.FC<DraftEditorProps> = ({
  draft,
  knowledges,
  onUpdateDraft,
  onRecheckFact,
  isRechecking = false,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'factcheck'>('content');

  const factCheck = draft.factCheck;

  const handleContentChange = (newContent: string) => {
    onUpdateDraft({
      ...draft,
      contentMarkdown: newContent,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(draft.contentMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([draft.contentMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${draft.title.replace(/[\s/\\?%*:|"<>]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // スコアに基づくバッジカラー
  const getScoreBadge = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        label: '極めて高精度 (信頼度高)',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1" />,
      };
    }
    if (score >= 70) {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        label: '確認推奨箇所あり',
        icon: <AlertTriangle className="w-4 h-4 text-amber-400 mr-1" />,
      };
    }
    return {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      label: '要修正（リスクあり）',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400 mr-1" />,
    };
  };

  const scoreInfo = factCheck ? getScoreBadge(factCheck.score) : null;

  return (
    <div className="space-y-6">
      {/* 記事タイトル & 操作ヘッダー */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
                キーワード: {draft.keyword}
              </span>
              {draft.promptType === 'medical' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium">
                  🏥 医療系下書き
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
                  🏢 普通モード
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white">{draft.title}</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'コピー完了' : 'Markdownコピー'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.md保存</span>
            </button>
          </div>
        </div>

        {/* ファクトチェックスコア概要バー */}
        {factCheck && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className={`flex items-center text-xs px-3 py-1.5 rounded-lg border font-semibold ${scoreInfo?.bg}`}>
                {scoreInfo?.icon}
                <span>ファクト信頼度スコア: {factCheck.score} / 100点</span>
              </div>
              <span className="text-xs text-slate-400">
                （検出指摘: {factCheck.totalIssues}件）
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {factCheck.summary}
            </p>
          </div>
        )}
      </div>

      {/* メインビュー（2カラムまたはタブ切り替え） */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左側: 記事本文（プレビュー or 編集） */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded flex items-center space-x-1 transition ${
                  viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>プレビュー</span>
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded flex items-center space-x-1 transition ${
                  viewMode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Markdown直接編集</span>
              </button>
            </div>
            <span className="text-xs text-slate-400">
              文字数: {draft.contentMarkdown.length} 文字
            </span>
          </div>

          {viewMode === 'preview' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-slate-100 prose prose-invert max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300">
              <div className="whitespace-pre-wrap font-sans leading-relaxed text-sm">
                {draft.contentMarkdown}
              </div>
            </div>
          ) : (
            <textarea
              rows={24}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
              value={draft.contentMarkdown}
              onChange={(e) => handleContentChange(e.target.value)}
            />
          )}

          {/* メタ情報カード */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              記事メタ情報（LLMO / SEO設定）
            </h3>
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">メタディスクリプション:</span>
              <p className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {draft.metaDescription || '未設定'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">推奨タグ:</span>
              <div className="flex flex-wrap gap-1.5">
                {draft.suggestedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右側: ファクトチェック指摘事項 & 参照ナレッジ */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>ファクトチェック検証詳細</span>
              </h3>
              {onRecheckFact && (
                <button
                  onClick={onRecheckFact}
                  disabled={isRechecking}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  {isRechecking ? '再検証中...' : '再検証'}
                </button>
              )}
            </div>

            {/* 指摘事項一覧 */}
            {!factCheck || factCheck.issues.length === 0 ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                <Check className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-emerald-300">リスク表現は検出されませんでした</p>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  元ナレッジに忠実で、薬機法・誇大広告の懸念はありません。
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {factCheck.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border text-xs space-y-2 ${
                      issue.severity === 'high'
                        ? 'bg-rose-950/40 border-rose-800/80'
                        : issue.severity === 'medium'
                        ? 'bg-amber-950/40 border-amber-800/80'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          issue.severity === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : issue.severity === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {issue.type === 'medical_law_risk'
                          ? '🏥 薬機法/医療広告リスク'
                          : issue.type === 'hallucination_suspect'
                          ? '⚠️ ハルシネーションの疑い'
                          : '📝 要確認事項'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {issue.severity === 'high' ? '重大' : issue.severity === 'medium' ? '警告' : '確認'}
                      </span>
                    </div>

                    {/* 該当テキスト */}
                    <div className="font-mono text-slate-200 bg-slate-900/80 p-2 rounded border border-slate-800">
                      &quot;{issue.highlightText}&quot;
                    </div>

                    {/* 理由 */}
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {issue.reason}
                    </p>

                    {/* 修正提案 */}
                    {issue.suggestion && (
                      <div className="text-[11px] text-indigo-300 bg-indigo-950/40 p-2 rounded border border-indigo-900/40">
                        <span className="font-semibold block">💡 修正アドバイス:</span>
                        {issue.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 参照されたナレッジ一覧 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>根拠として参照された頭脳資料</span>
            </h3>
            {draft.usedKnowledgeIds.length === 0 ? (
              <p className="text-xs text-slate-500">ナレッジの参照はありません（汎用生成）</p>
            ) : (
              <ul className="space-y-2">
                {knowledges
                  .filter((k) => draft.usedKnowledgeIds.includes(k.id))
                  .map((k) => (
                    <li
                      key={k.id}
                      className="text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300"
                    >
                      <span className="font-semibold text-white block">{k.title}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        種別: {k.sourceType.toUpperCase()}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
