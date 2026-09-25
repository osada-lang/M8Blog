'use client';

import React, { useState } from 'react';
import { Client, PromptType } from '@/types';
import { Building2, X, Plus, Sparkles, ShieldAlert } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (client: Client) => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onAddClient,
}) => {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [promptType, setPromptType] = useState<PromptType>('general');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [hearingSheetUrl, setHearingSheetUrl] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newClient: Client = {
      id: `client-${Date.now()}`,
      name: name.trim(),
      industry: industry.trim() || '店舗・サービス',
      promptType,
      description: description.trim(),
      spreadsheetUrl: spreadsheetUrl.trim() || undefined,
      documentUrl: documentUrl.trim() || undefined,
      hearingSheetUrl: hearingSheetUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddClient(newClient);
    setName('');
    setIndustry('');
    setSpreadsheetUrl('');
    setDocumentUrl('');
    setHearingSheetUrl('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#e5e5ea] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-[#f5f5f7] border border-[#e5e5ea] flex items-center justify-center text-[#0066cc]">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-base font-semibold text-[#1d1d1f]">新規クライアント（店舗・企業）の登録</h3>
          </div>
          <button onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          {/* プロンプトタイプ選択 */}
          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1.5">
              適用するプロンプト種別 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPromptType('general')}
                className={`p-3 rounded-xl border text-left transition flex items-center space-x-2 ${
                  promptType === 'general'
                    ? 'bg-white border-[#0066cc] shadow-sm ring-2 ring-[#0066cc]/20'
                    : 'bg-[#f5f5f7] border-[#e5e5ea] hover:border-[#d2d2d7]'
                }`}
              >
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#1d1d1f] block">普通モード</span>
                  <span className="text-[10px] text-[#86868b] block">365ブログ（一般）</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPromptType('medical')}
                className={`p-3 rounded-xl border text-left transition flex items-center space-x-2 ${
                  promptType === 'medical'
                    ? 'bg-white border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                    : 'bg-[#f5f5f7] border-[#e5e5ea] hover:border-[#d2d2d7]'
                }`}
              >
                <div className="p-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#1d1d1f] block">医療系モード</span>
                  <span className="text-[10px] text-[#86868b] block">629医療用YMYL</span>
                </div>
              </button>
            </div>
          </div>

          {/* クライアント名 */}
          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
              店舗・クリニック・企業名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="例: 株式会社PAQLA / 表参道スキンクリニック"
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* 業種 */}
          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
              業種・診療科目
            </label>
            <input
              type="text"
              placeholder="例: 映像制作・企業PR、美容皮膚科など"
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc]"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          {/* 📊 KWスプレッドシートURL */}
          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
              📊 キーワードスプレッドシートURL
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc]"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
            />
          </div>

          {/* 📄 文献要約集URL */}
          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
              📄 文献要約集GoogleドキュメントURL
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/document/d/..."
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc]"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
            />
          </div>

          {/* 📝 ヒアリングシートURL */}
          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
              📝 ヒアリングシートGoogleドキュメントURL
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/document/d/..."
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc]"
              value={hearingSheetUrl}
              onChange={(e) => setHearingSheetUrl(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#e5e5ea]">
            <button
              type="button"
              onClick={onClose}
              className="apple-secondary-btn px-4 py-1.5 text-xs font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="apple-pill-btn px-5 py-1.5 text-xs font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>登録する</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
