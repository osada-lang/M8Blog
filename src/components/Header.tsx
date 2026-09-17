'use client';

import React from 'react';
import { Client } from '@/types';
import { Building2, Sparkles, ShieldAlert, KeyRound, Plus, ChevronDown } from 'lucide-react';

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
    <header className="apple-frosted-nav sticky top-0 z-30 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* ロゴ・ブランド */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#1d1d1f] flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-base text-[#1d1d1f] tracking-tight">
                M8 Blog Studio
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#86868b] border border-[#d2d2d7] font-medium">
                LLMO & Medical
              </span>
            </div>
          </div>
        </div>

        {/* クライアント選択・設定 */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* クライアント選択ドロップダウン */}
          <div className="relative flex items-center bg-[#f5f5f7] border border-[#e5e5ea] rounded-full px-3 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#86868b] mr-1.5" />
            <select
              className="bg-transparent text-xs text-[#1d1d1f] font-medium focus:outline-none cursor-pointer pr-4 appearance-none"
              value={selectedClient?.id || ''}
              onChange={(e) => {
                const found = clients.find((c) => c.id === e.target.value);
                if (found) onSelectClient(found);
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-[#1d1d1f]">
                  {c.name} ({c.promptType === 'medical' ? '医療系' : '普通'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#86868b] absolute right-2.5 pointer-events-none" />
            
            <button
              onClick={onOpenNewClientModal}
              title="新規クライアントを追加"
              className="ml-1 pl-1.5 border-l border-[#d2d2d7] text-[#86868b] hover:text-[#0066cc] transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* プロンプトタイプバッジ */}
          {selectedClient && (
            <div
              className={`hidden md:flex items-center text-xs px-2.5 py-1 rounded-full font-medium border ${
                selectedClient.promptType === 'medical'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              {selectedClient.promptType === 'medical' ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  医療系（薬機法ガード）
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  普通モード（LLMO最適化）
                </>
              )}
            </div>
          )}

          {/* API Key設定ボタン */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center text-xs px-3 py-1 rounded-full border transition font-medium ${
              hasApiKey
                ? 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7]'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <KeyRound className="w-3 h-3 mr-1 text-[#86868b]" />
            <span>{hasApiKey ? 'Claude API設定済' : 'APIキー設定'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
