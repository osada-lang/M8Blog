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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">プロンプト設計・管理</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            「普通」「医療系」の2種類のプロンプトを管理します。先方でお持ちの既存プロンプトをそのまま貼り付けて利用・微調整できます。
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetToDefault}
            className="flex items-center space-x-1 text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>初期値に戻す</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? '保存しました！' : '変更を保存'}</span>
          </button>
        </div>
      </div>

      {/* プロンプト切り替えタブ */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setSelectedType('general')}
          className={`p-4 rounded-xl border text-left transition flex items-start space-x-3 ${
            selectedType === 'general'
              ? 'bg-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30'
              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">① 普通プロンプト（一般企業・店舗）</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              LLMO・SEO最適化、Q&A構成、店舗の強みを訴求する標準テンプレート
            </p>
          </div>
        </button>

        <button
          onClick={() => setSelectedType('medical')}
          className={`p-4 rounded-xl border text-left transition flex items-start space-x-3 ${
            selectedType === 'medical'
              ? 'bg-slate-900 border-rose-500 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/30'
              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">② 医療系プロンプト（クリニック・医院）</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              薬機法・医療広告ガイドライン遵守、誇大表現抑制、免責事項の自動付与
            </p>
          </div>
        </button>
      </div>

      {/* プロンプトエディタ領域 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        {/* 利用可能変数のヒントバー */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-xs font-semibold text-indigo-400 block mb-1">💡 利用可能な埋め込み変数：</span>
          <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-300">
            <code className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{'{{CLIENT_NAME}}'}</code>
            <code className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{'{{CLIENT_INDUSTRY}}'}</code>
            <code className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{'{{TARGET_AUDIENCE}}'}</code>
            <code className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{'{{KEYWORD}}'}</code>
            <code className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{'{{SUB_KEYWORDS}}'}</code>
            <code className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{'{{KNOWLEDGE_CONTEXT}}'}</code>
            <code className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{'{{WORD_COUNT}}'}</code>
          </div>
        </div>

        {/* システムプロンプト（役割とハルシネーション防御ルール） */}
        <div>
          <label className="text-xs font-semibold text-slate-200 block mb-1.5 flex items-center justify-between">
            <span>システムプロンプト（System Prompt / ハルシネーション抑止ルール）</span>
            <span className="text-[11px] text-indigo-400 font-normal">Claudeの役割・厳格な制限事項を定義</span>
          </label>
          <textarea
            rows={8}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
            value={activePrompt.systemPrompt}
            onChange={(e) => handleUpdate('systemPrompt', e.target.value)}
          />
        </div>

        {/* ユーザープロンプトテンプレート */}
        <div>
          <label className="text-xs font-semibold text-slate-200 block mb-1.5 flex items-center justify-between">
            <span>記事構成プロンプトテンプレート（User Prompt Template）</span>
            <span className="text-[11px] text-indigo-400 font-normal">先方の構成案・指示書をここに反映</span>
          </label>
          <textarea
            rows={10}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
            value={activePrompt.userPromptTemplate}
            onChange={(e) => handleUpdate('userPromptTemplate', e.target.value)}
          />
        </div>

        {/* ハルシネーション・ファクトチェック基準 */}
        <div>
          <label className="text-xs font-semibold text-slate-200 block mb-1.5 flex items-center justify-between">
            <span>ファクトチェック検証ルール（自動検査の基準）</span>
            <span className="text-[11px] text-amber-400 font-normal">生成後の自動照合でチェックする項目</span>
          </label>
          <textarea
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
            value={activePrompt.hallucinationRules}
            onChange={(e) => handleUpdate('hallucinationRules', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
