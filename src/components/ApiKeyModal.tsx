'use client';

import React, { useState } from 'react';
import { KeyRound, X, Check, ShieldCheck } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(keyInput.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#e5e5ea] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-[#f5f5f7] border border-[#e5e5ea] flex items-center justify-center text-[#0066cc]">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-base font-semibold text-[#1d1d1f]">Anthropic APIキー設定</h3>
          </div>
          <button onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#86868b] leading-relaxed">
          Claude 3.5 Sonnet による高精度なブログ執筆・ファクトチェックを行うためのAPIキーです。ブラウザのローカルストレージに安全に保管されます。
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1.5">
              Anthropic API Key (<code className="text-[#0066cc]">sk-ant-...</code>)
            </label>
            <input
              type="password"
              placeholder="sk-ant-api03-..."
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc] font-mono"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] text-[11px] text-[#515154] flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#0066cc] shrink-0 mt-0.5" />
            <div>
              <span>※ APIキーが未入力の場合は、システムのシミュレーション（モック生成＆ルールベース検査）でUIの動作をお試しいただけます。</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="apple-secondary-btn px-4 py-1.5 text-xs font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="apple-pill-btn px-4 py-1.5 text-xs font-semibold flex items-center space-x-1"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{saved ? '保存完了' : 'キーを保存'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
