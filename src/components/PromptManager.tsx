'use client';

import React, { useState } from 'react';
import { PromptTemplate, PromptType } from '@/types';
import { Terminal, ShieldAlert, Sparkles, Check, Save, RotateCcw } from 'lucide-react';
import { DEFAULT_PROMPT_TEMPLATES } from '@/lib/defaultPrompts';

interface PromptManagerProps {
  prompts: PromptTemplate[];
  onSavePrompts: (prompts: PromptTemplate[]) => void;
}

export const PromptManager: React.FC<PromptManagerProps> = ({ prompts, onSavePrompts }) => {
  const [selectedType, setSelectedType] = useState<PromptType>('general');
  const [currentPrompts, setCurrentPrompts] = useState<PromptTemplate[]>(prompts);
  const [isSaved, setIsSaved] = useState(false);

  const activePrompt = currentPrompts.find((p) => p.type === selectedType) || currentPrompts[0];

  const handleUpdate = (field: keyof PromptTemplate, value: string) => {
    setCurrentPrompts((prev) =>
      prev.map((p) => (p.type === selectedType ? { ...p, [field]: value, updatedAt: new Date().toISOString() } : p))
    );
    setIsSaved(false);
  };

  const handleSave = () => {
    onSavePrompts(currentPrompts);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleResetToDefault = () => {
    if (confirm('このプロンプトをデフォルト初期値に戻しますか？')) {
      const defaultOne = DEFAULT_PROMPT_TEMPLATES.find((p) => p.type === selectedType);
      if (defaultOne) {
        setCurrentPrompts((prev) =>
          prev.map((p) => (p.type === selectedType ? { ...defaultOne, updatedAt: new Date().toISOString() } : p))
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 上部説明 */}
      <div className="apple-card p-6 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-[#0066cc]" />
            <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">プロンプト設計・管理</h2>
          </div>
          <p className="text-xs text-[#86868b] mt-1 max-w-2xl leading-relaxed">
            「普通」「医療系」の2種類のプロンプトを管理します。先方の既存プロンプトをそのまま貼り付けて利用・微調整できます。
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetToDefault}
            className="apple-secondary-btn flex items-center space-x-1 text-xs px-3 py-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>初期値に戻す</span>
          </button>
          <button
            onClick={handleSave}
            className="apple-pill-btn flex items-center space-x-1 text-xs font-semibold px-4 py-1.5"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? '保存完了' : '変更を保存'}</span>
          </button>
        </div>
      </div>

      {/* プロンプト切り替えカード */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setSelectedType('general')}
          className={`p-5 rounded-2xl border text-left transition flex items-start space-x-3 ${
            selectedType === 'general'
              ? 'bg-white border-[#0066cc] shadow-md ring-2 ring-[#0066cc]/20'
              : 'bg-[#f5f5f7] border-[#e5e5ea] hover:border-[#d2d2d7]'
          }`}
        >
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f]">① 普通プロンプト（一般企業・店舗）</h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              LLMO・SEO最適化、Q&A構成、店舗の強み訴求
            </p>
          </div>
        </button>

        <button
          onClick={() => setSelectedType('medical')}
          className={`p-5 rounded-2xl border text-left transition flex items-start space-x-3 ${
            selectedType === 'medical'
              ? 'bg-white border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-[#f5f5f7] border-[#e5e5ea] hover:border-[#d2d2d7]'
          }`}
        >
          <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f]">② 医療系プロンプト（クリニック・医院）</h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              薬機法・医療広告ガイドライン遵守、免責事項付与
            </p>
          </div>
        </button>
      </div>

      {/* エディタ */}
      <div className="apple-card p-6 space-y-5">
        {/* 利用可能変数バー */}
        <div className="bg-[#f5f5f7] p-3 rounded-xl border border-[#e5e5ea]">
          <span className="text-xs font-semibold text-[#0066cc] block mb-1">💡 利用可能な埋め込み変数：</span>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-[#515154]">
            <code className="bg-white px-2 py-0.5 rounded-md border border-[#d2d2d7]">{'{{CLIENT_NAME}}'}</code>
            <code className="bg-white px-2 py-0.5 rounded-md border border-[#d2d2d7]">{'{{CLIENT_INDUSTRY}}'}</code>
            <code className="bg-white px-2 py-0.5 rounded-md border border-[#d2d2d7]">{'{{TARGET_AUDIENCE}}'}</code>
            <code className="bg-white px-2 py-0.5 rounded-md border border-[#d2d2d7]">{'{{KEYWORD}}'}</code>
            <code className="bg-white px-2 py-0.5 rounded-md border border-[#d2d2d7]">{'{{SUB_KEYWORDS}}'}</code>
            <code className="bg-white px-2 py-0.5 rounded-md border border-[#d2d2d7]">{'{{KNOWLEDGE_CONTEXT}}'}</code>
            <code className="bg-white px-2 py-0.5 rounded-md border border-[#d2d2d7]">{'{{WORD_COUNT}}'}</code>
          </div>
        </div>

        {/* システムプロンプト */}
        <div>
          <label className="text-xs font-semibold text-[#1d1d1f] block mb-1.5 flex items-center justify-between">
            <span>システムプロンプト（System Prompt / ハルシネーション抑止）</span>
            <span className="text-[11px] text-[#0066cc] font-normal">役割と事実準拠ルール</span>
          </label>
          <textarea
            rows={8}
            className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl p-3 text-xs text-[#1d1d1f] font-mono leading-relaxed focus:outline-none focus:bg-white focus:border-[#0066cc]"
            value={activePrompt.systemPrompt}
            onChange={(e) => handleUpdate('systemPrompt', e.target.value)}
          />
        </div>

        {/* ユーザープロンプトテンプレート */}
        <div>
          <label className="text-xs font-semibold text-[#1d1d1f] block mb-1.5 flex items-center justify-between">
            <span>構成プロンプトテンプレート（User Prompt Template）</span>
            <span className="text-[11px] text-[#0066cc] font-normal">先方の構成指示を反映</span>
          </label>
          <textarea
            rows={10}
            className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl p-3 text-xs text-[#1d1d1f] font-mono leading-relaxed focus:outline-none focus:bg-white focus:border-[#0066cc]"
            value={activePrompt.userPromptTemplate}
            onChange={(e) => handleUpdate('userPromptTemplate', e.target.value)}
          />
        </div>

        {/* ハルシネーション基準 */}
        <div>
          <label className="text-xs font-semibold text-[#1d1d1f] block mb-1.5">
            ファクトチェック検証ルール
          </label>
          <textarea
            rows={3}
            className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl p-3 text-xs text-[#1d1d1f] font-mono leading-relaxed focus:outline-none focus:bg-white focus:border-[#0066cc]"
            value={activePrompt.hallucinationRules}
            onChange={(e) => handleUpdate('hallucinationRules', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
