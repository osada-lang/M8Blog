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
      <div className="apple-card p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#0066cc]" />
            <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">{client.name} の生成履歴・下書き一覧</h2>
          </div>
          <p className="text-xs text-[#86868b] mt-1">
            生成されたブログ記事とファクトチェック結果を管理・再編集できます。
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center space-x-1.5"
        >
          <span>新規記事を生成</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {clientDrafts.length === 0 ? (
        <div className="apple-card p-12 text-center text-[#86868b] border-dashed">
          <FileText className="w-10 h-10 mx-auto mb-2 text-[#d2d2d7]" />
          <p className="text-sm font-semibold text-[#1d1d1f]">まだ生成された下書きはありません</p>
          <p className="text-xs text-[#86868b] mt-1 mb-4">
            キーワードを指定して、AI下書き生成を実行してください。
          </p>
          <button
            onClick={onCreateNew}
            className="apple-pill-btn px-4 py-2 text-xs font-semibold"
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
                className="apple-card p-5 flex flex-col justify-between hover:border-[#0066cc]/40 transition group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#0066cc] border border-[#e5e5ea] font-medium">
                      {draft.keyword}
                    </span>
                    {draft.factCheck && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full flex items-center font-bold ${
                          score >= 90
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : score >= 70
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {score >= 90 ? (
                          <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                        ) : score >= 70 ? (
                          <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                        ) : (
                          <ShieldAlert className="w-3 h-3 mr-1 text-rose-600" />
                        )}
                        スコア: {score}点
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => onSelectDraft(draft)}
                    className="text-sm font-semibold text-[#1d1d1f] group-hover:text-[#0066cc] transition cursor-pointer line-clamp-2"
                  >
                    {draft.title}
                  </h3>

                  <p className="text-xs text-[#86868b] line-clamp-3 leading-relaxed">
                    {draft.contentMarkdown.replace(/^#+\s+/gm, '').slice(0, 140)}...
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e5e5ea] flex items-center justify-between text-xs text-[#86868b]">
                  <span className="flex items-center space-x-1 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(draft.createdAt).toLocaleDateString('ja-JP')}</span>
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onDeleteDraft(draft.id)}
                      className="p-1 text-[#86868b] hover:text-rose-600 rounded transition"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectDraft(draft)}
                      className="apple-secondary-btn px-2.5 py-0.5 text-xs flex items-center space-x-1"
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
