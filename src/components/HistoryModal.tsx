'use client';

import React from 'react';
import { KeywordHistoryItem } from '@/types';
import { History, X, Calendar, Sparkles } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItems: KeywordHistoryItem[];
  onSelectKeyword?: (keyword: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  historyItems,
  onSelectKeyword,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#e5e5ea] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5e5ea] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-[#f5f5f7] border border-[#e5e5ea] flex items-center justify-center text-[#0066cc]">
              <History className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-base font-semibold text-[#1d1d1f]">生成キーワード履歴</h3>
          </div>
          <button onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#86868b]">
          過去にブログ記事を生成したキーワードの一覧です（最新順・{historyItems.length}件）。
        </p>

        {historyItems.length === 0 ? (
          <div className="p-8 text-center text-[#86868b] bg-[#f5f5f7] rounded-xl border border-[#e5e5ea]">
            <Sparkles className="w-6 h-6 mx-auto mb-1.5 text-[#d2d2d7]" />
            <p className="text-xs font-semibold text-[#1d1d1f]">まだ生成履歴がありません</p>
            <p className="text-[11px] text-[#86868b] mt-0.5">
              記事を生成すると、使用したキーワードがここに自動記録されます。
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {historyItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (onSelectKeyword) {
                    onSelectKeyword(item.keyword);
                    onClose();
                  }
                }}
                className={`p-3 bg-[#f5f5f7] hover:bg-[#e5e5ea]/70 rounded-xl border border-[#e5e5ea] transition flex items-center justify-between ${
                  onSelectKeyword ? 'cursor-pointer' : ''
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    {item.day && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#1d1d1f] text-white">
                        Day {item.day}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-[#1d1d1f]">
                      {item.keyword}
                    </span>
                  </div>
                  {item.kwType && (
                    <span className="text-[10px] text-[#86868b] block">
                      種別: {item.kwType === 'main' ? 'メインキーワード' : 'リーチキーワード'}
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-[#86868b] flex items-center space-x-1 shrink-0 ml-2">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(item.generatedAt).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[#e5e5ea]">
          <button
            onClick={onClose}
            className="apple-secondary-btn px-4 py-1.5 text-xs font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
