'use client';

import React, { useState } from 'react';
import { BlogDraft, Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { 
  Sparkles, 
  Loader2, 
  ChevronDown
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 操作パネル */}
      <div className="apple-card p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
            ブログ記事を生成する
          </h2>
        </div>

        {sheetRows.length === 0 ? (
          <div className="p-8 text-center text-[#86868b]">
            <p className="text-xs">対象のキーワードがありません。</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* キーワード名プルダウン選択 */}
            <div>
              <label className="text-xs font-semibold text-[#1d1d1f] block mb-1.5">
                執筆するキーワードを選択
              </label>
              <div className="relative">
                <select
                  className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-4 py-3 text-sm font-semibold text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 appearance-none cursor-pointer pr-10"
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

            {/* 選択されたキーワードの設計プレビュー（5項目縦並び・スクロール対応） */}
            {selectedRow && (
              <div className="p-5 bg-[#f5f5f7] rounded-2xl border border-[#e5e5ea] space-y-3.5 max-h-80 overflow-y-auto">
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

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            {/* 生成ボタン */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedRow}
              className="apple-pill-btn w-full py-3.5 px-6 text-sm font-semibold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Claude 3.5 Sonnet で執筆中（文献照合・ファクトチェック）...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>この記事を生成する（Claude 3.5 Sonnet）</span>
                </>
              )}
            </button>
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
