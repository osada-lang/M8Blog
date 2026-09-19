'use client';

import React from 'react';
import { Client } from '@/types';
import { Building2, Sparkles, Plus, ChevronDown, ExternalLink } from 'lucide-react';

interface HeaderProps {
  clients: Client[];
  selectedClient: Client | null;
  onSelectClient: (client: Client) => void;
  onOpenNewClientModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  clients,
  selectedClient,
  onSelectClient,
  onOpenNewClientModal,
}) => {
  return (
    <header className="apple-frosted-nav sticky top-0 z-30 transition-all">
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between">
        {/* ロゴ・ブランド */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1d1d1f] flex items-center justify-center text-white shadow-sm shrink-0">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <span className="font-semibold text-sm sm:text-base text-[#1d1d1f] tracking-tight">
            M8 Blog Studio
          </span>
        </div>

        {/* クライアント選択 ＆ 文献・KWリンク */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* クライアント選択ドロップダウン */}
          <div className="relative flex items-center bg-[#f5f5f7] border border-[#e5e5ea] rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#86868b] mr-1 sm:mr-1.5 shrink-0" />
            <select
              className="bg-transparent text-[11px] sm:text-xs text-[#1d1d1f] font-medium focus:outline-none cursor-pointer pr-3.5 sm:pr-4 appearance-none max-w-[110px] sm:max-w-[160px] truncate"
              value={selectedClient?.id || ''}
              onChange={(e) => {
                const found = clients.find((c) => c.id === e.target.value);
                if (found) onSelectClient(found);
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-[#1d1d1f]">
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#86868b] absolute right-2 sm:right-2.5 pointer-events-none" />

            <button
              onClick={onOpenNewClientModal}
              title="新規クライアントを追加"
              className="ml-1 sm:ml-1.5 pl-1 sm:pl-1.5 border-l border-[#d2d2d7] text-[#86868b] hover:text-[#0066cc] transition"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {/* 📄 文献リンク */}
          {selectedClient?.documentUrl && (
            <a
              href={selectedClient.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-secondary-btn flex items-center space-x-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium"
            >
              <span>📄 文献</span>
              <ExternalLink className="w-2.5 h-2.5 hidden sm:inline" />
            </a>
          )}

          {/* 📊 KWリンク */}
          {selectedClient?.spreadsheetUrl && (
            <a
              href={selectedClient.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-secondary-btn flex items-center space-x-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium"
            >
              <span>📊 KW</span>
              <ExternalLink className="w-2.5 h-2.5 hidden sm:inline" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
