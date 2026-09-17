'use client';

import React from 'react';
import { BlogDraft, Client } from '@/types';
import { FileText, Trash2, ArrowRight, ShieldCheck, ShieldAlert, AlertTriangle, Calendar } from 'lucide-react';

interface DraftListProps {
  client: Client;
  drafts: BlogDraft[];
  onSelectDraft: (draft: BlogDraft) => void;
  onDeleteDraft: (id: string) => void;
  onCreateNew: () => void;
}

export const DraftList: React.FC<DraftListProps> = ({
  client,
  drafts,
  onSelectDraft,
  onDeleteDraft,
  onCreateNew,
}) => {
  const clientDrafts = drafts.filter((d) => d.clientId === client.id);

  return (
    <div className="space-y-6">
      {/* 上部 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">{client.name} の生成履歴・下書き一覧</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            生成されたブログ記事とファクトチェック結果を管理・再編集できます。
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1.5"
        >
          <span>新規記事を生成</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {clientDrafts.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-base font-semibold text-slate-300">まだ生成された下書きはありません</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            キーワードを指定して、AI下書き生成を実行してください。
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
          >
            最初の記事を生成する
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientDrafts.map((draft) => {
            const score = draft.factCheck?.score ?? 100;
            return (
              <div
                key={draft.id}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 flex flex-col justify-between transition group"
              >
                <div className="space-y-3">
                  {/* キーワード & バッジ */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 font-medium">
                      {draft.keyword}
                    </span>
                    {draft.factCheck && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded flex items-center font-bold ${
                          score >= 90
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : score >= 70
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {score >= 90 ? (
                          <ShieldCheck className="w-3 h-3 mr-1" />
                        ) : score >= 70 ? (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        ) : (
                          <ShieldAlert className="w-3 h-3 mr-1" />
                        )}
                        スコア: {score}点
                      </span>
                    )}
                  </div>

                  {/* 記事タイトル */}
                  <h3
                    onClick={() => onSelectDraft(draft)}
                    className="text-sm font-bold text-white group-hover:text-indigo-300 transition cursor-pointer line-clamp-2"
                  >
                    {draft.title}
                  </h3>

                  {/* 本文プレビュー */}
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {draft.contentMarkdown.replace(/^#+\s+/gm, '').slice(0, 150)}...
                  </p>
                </div>

                {/* フッター */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center space-x-1 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(draft.createdAt).toLocaleDateString('ja-JP')}</span>
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onDeleteDraft(draft.id)}
                      className="p-1.5 hover:text-rose-400 rounded transition"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectDraft(draft)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition flex items-center space-x-1"
                    >
                      <span>開く</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
