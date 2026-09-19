'use client';

import React, { useState } from 'react';
import { BlogDraft, Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { 
  Sparkles, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { DraftEditor } from './DraftEditor';

interface SimpleGeneratorProps {
  client: Client;
  sheetRows: KeywordSheetRow[];
  knowledges: KnowledgeItem[];
  prompts: PromptTemplate[];
  apiKey: string;
  onUpdateSheetRows: (rows: KeywordSheetRow[]) => void;
}

export const SimpleGenerator: React.FC<SimpleGeneratorProps> = ({
  client,
  sheetRows,
  knowledges,
  prompts,
  apiKey,
}) => {
  const [selectedRowId, setSelectedRowId] = useState<string>(sheetRows[0]?.id || '');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<BlogDraft | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedRow = sheetRows.find((r) => r.id === selectedRowId) || sheetRows[0];
  const activePrompt = prompts.find((p) => p.type === client.promptType) || prompts[0];
  const clientKnowledges = knowledges.filter((k) => k.clientId === client.id);

  // 1記事生成
  const handleGenerate = async () => {
    if (!selectedRow) return;

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          knowledges: clientKnowledges,
          promptTemplate: activePrompt,
          generateRequest: {
            clientId: client.id,
            sheetRow: selectedRow,
            promptType: client.promptType,
            apiKey,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '記事生成に失敗しました');

      const draft: BlogDraft = {
        id: `draft-${Date.now()}`,
        clientId: client.id,
        keyword: selectedRow.mainKeyword,
        subKeywords: [selectedRow.reachKeyword, selectedRow.suggestKeywords].filter(Boolean) as string[],
        promptType: client.promptType,
        title: json.data.title,
        contentMarkdown: json.data.contentMarkdown,
        metaDescription: json.data.metaDescription,
        suggestedTags: json.data.suggestedTags,
        usedKnowledgeIds: json.data.usedKnowledgeIds,
        factCheck: json.data.factCheck,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCurrentDraft(draft);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* 操作パネル */}
      <div className="apple-card p-5 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#1d1d1f] tracking-tight">
            ブログ記事を生成する
          </h2>
        </div>

        {sheetRows.length === 0 ? (
          <div className="p-8 text-center text-[#86868b]">
            <p className="text-xs">対象のキーワードがありません。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* キーワード名プルダウン選択 */}
            <div>
              <label className="text-xs font-semibold text-[#1d1d1f] block mb-1.5">
                執筆するキーワードを選択
              </label>
              <div className="relative">
                <select
                  className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 appearance-none cursor-pointer pr-10"
                  value={selectedRow?.id || ''}
                  onChange={(e) => setSelectedRowId(e.target.value)}
                >
                  {sheetRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.mainKeyword}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#86868b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* キーワード詳細アコーディオン */}
            {selectedRow && (
              <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden bg-[#fafafc] transition">
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] transition"
                >
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-[#0066cc]" />
                    <span>キーワード詳細</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[#86868b] text-[11px]">
                    <span>{isDetailsOpen ? '閉じる' : '開く'}</span>
                    {isDetailsOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {isDetailsOpen && (
                  <div className="p-4 sm:p-5 border-t border-[#e5e5ea] space-y-3.5 bg-[#f5f5f7] max-h-80 overflow-y-auto animate-in fade-in duration-150">
                    {/* 1. 想定読者 */}
                    <div>
                      <span className="text-xs font-bold text-[#1d1d1f] block mb-1">
                        想定読者
                      </span>
                      <p className="text-xs text-[#515154] leading-relaxed bg-white p-3 rounded-xl border border-[#e5e5ea]">
                        {selectedRow.targetAudience || '未設定'}
                      </p>
                    </div>

                    {/* 2. 検索意図 */}
                    <div>
                      <span className="text-xs font-bold text-[#1d1d1f] block mb-1">
                        検索意図
                      </span>
                      <p className="text-xs text-[#515154] leading-relaxed bg-white p-3 rounded-xl border border-[#e5e5ea]">
                        {selectedRow.searchIntent || '未設定'}
                      </p>
                    </div>

                    {/* 3. 記事の結論（冒頭AIサマリー用） */}
                    <div>
                      <span className="text-xs font-bold text-[#1d1d1f] block mb-1">
                        記事の結論（冒頭AIサマリー用）
                      </span>
                      <p className="text-xs text-[#515154] leading-relaxed bg-white p-3 rounded-xl border border-[#e5e5ea]">
                        {selectedRow.conclusion || '未設定'}
                      </p>
                    </div>

                    {/* 4. 重複チェック用1文（この記事でしか言わない事） */}
                    <div>
                      <span className="text-xs font-bold text-[#0066cc] block mb-1">
                        重複チェック用1文（この記事でしか言わない事）
                      </span>
                      <p className="text-xs text-[#0066cc] leading-relaxed bg-blue-50/60 p-3 rounded-xl border border-blue-100 font-medium">
                        {selectedRow.uniquePoint || '未設定'}
                      </p>
                    </div>

                    {/* 5. AIサジェストKW */}
                    {selectedRow.suggestKeywords && (
                      <div>
                        <span className="text-xs font-bold text-[#1d1d1f] block mb-1">
                          AIサジェストKW
                        </span>
                        <p className="text-xs text-[#515154] leading-relaxed bg-white p-3 rounded-xl border border-[#e5e5ea]">
                          {selectedRow.suggestKeywords}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 break-all leading-relaxed">
                {errorMsg}
              </div>
            )}

            {/* 生成ボタン（テキスト幅・モデル名削除・レスポンシブ） */}
            <div className="pt-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedRow}
                className="apple-pill-btn inline-flex items-center justify-center space-x-2 py-3 px-6 sm:px-7 text-xs sm:text-sm font-semibold shadow-sm disabled:opacity-50 transition w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>執筆中（文献照合・ファクトチェック）...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>この記事を生成する</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 生成結果エディタ */}
      {currentDraft && (
        <div className="pt-2">
          <DraftEditor
            draft={currentDraft}
            knowledges={knowledges}
            onUpdateDraft={(updated) => setCurrentDraft(updated)}
          />
        </div>
      )}
    </div>
  );
};
