'use client';

import React from 'react';
import { Client, PromptType } from '@/types';
import { Building2, Sparkles, ShieldAlert, KeyRound, Plus } from 'lucide-react';

interface HeaderProps {
  clients: Client[];
  selectedClient: Client | null;
  onSelectClient: (client: Client) => void;
  onOpenNewClientModal: () => void;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  clients,
  selectedClient,
  onSelectClient,
  onOpenNewClientModal,
  onOpenApiKeyModal,
  hasApiKey,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* ロゴ・タイトル */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                M8 Blog Studio
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                LLMO & Medical
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              クライアント頭脳RAG ＆ ハルシネーション自動検証システム
            </p>
          </div>
        </div>

        {/* クライアント選択・設定 */}
        <div className="flex items-center space-x-3">
          {/* クライアント選択ドロップダウン */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
            <Building2 className="w-4 h-4 text-slate-400 ml-2 mr-1" />
            <select
              className="bg-transparent text-sm text-slate-100 font-medium py-1 px-2 focus:outline-none cursor-pointer"
              value={selectedClient?.id || ''}
              onChange={(e) => {
                const found = clients.find((c) => c.id === e.target.value);
                if (found) onSelectClient(found);
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-800 text-slate-100">
                  {c.name} ({c.promptType === 'medical' ? '🏥 医療系' : '🏢 普通'})
                </option>
              ))}
            </select>
            <button
              onClick={onOpenNewClientModal}
              title="新規クライアントを追加"
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* プロンプトタイプバッジ */}
          {selectedClient && (
            <div
              className={`hidden md:flex items-center text-xs px-2.5 py-1.5 rounded-lg border font-medium ${
                selectedClient.promptType === 'medical'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {selectedClient.promptType === 'medical' ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                  医療系プロンプト（薬機法ガード適用）
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  普通モード（LLMO最適化）
                </>
              )}
            </div>
          )}

          {/* API Key設定ボタン */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center text-xs px-3 py-1.5 rounded-lg border transition ${
              hasApiKey
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 animate-pulse'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
            <span>{hasApiKey ? 'Claude API設定済' : 'APIキー設定'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
