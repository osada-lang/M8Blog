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
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

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
      targetAudience: targetAudience.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddClient(newClient);
    setName('');
    setIndustry('');
    setDescription('');
    setTargetAudience('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">新規クライアント（店舗・企業）の登録</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* プロンプトタイプ選択 */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              適用するプロンプト種別 <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPromptType('general')}
                className={`p-3 rounded-xl border text-left transition flex items-center space-x-2 ${
                  promptType === 'general'
                    ? 'bg-slate-800 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold block">普通モード</span>
                  <span className="text-[10px] text-slate-400 block">一般店舗・企業LLMO</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPromptType('medical')}
                className={`p-3 rounded-xl border text-left transition flex items-center space-x-2 ${
                  promptType === 'medical'
                    ? 'bg-slate-800 border-rose-500 text-white ring-1 ring-rose-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <div>
                  <span className="text-xs font-bold block">医療系モード</span>
                  <span className="text-[10px] text-slate-400 block">クリニック・薬機法配慮</span>
                </div>
              </button>
            </div>
          </div>

          {/* クライアント名 */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              店舗・クリニック・企業名 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="例: 銀座美容外科クリニック / 新宿整体院"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* 業種・診療科目 */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              業種・診療科目
            </label>
            <input
              type="text"
              placeholder="例: 美容皮膚科、歯科矯正、パーソナルジム、弁護士など"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          {/* ターゲット読者層 */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              想定ターゲット層・読者ペルソナ
            </label>
            <input
              type="text"
              placeholder="例: 30代〜50代の腰痛・肩こりに悩むデスクワーカー"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>

          {/* 概要・特徴 */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              店舗の概要・特徴（メモ）
            </label>
            <textarea
              rows={2}
              placeholder="例: 最新レーザー設備を導入、駅徒歩1分、完全個室対応"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>登録する</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
