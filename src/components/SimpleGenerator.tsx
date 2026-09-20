'use client';

import React, { useState, useEffect } from 'react';
import { BlogDraft, Client, KeywordHistoryItem, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { clientStore } from '@/lib/store';
import { 
  Sparkles, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  History,
  CheckCircle2
} from 'lucide-react';
import { DraftEditor } from './DraftEditor';
import { HistoryModal } from './HistoryModal';

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
  // キーワード種別: 'reach' (デフォルト・孫) または 'main' (メイン)
  const [activeKwType, setActiveKwType] = useState<'reach' | 'main'>('reach');
  const [selectedRowId, setSelectedRowId] = useState<string>('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<KeywordHistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<BlogDraft | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 履歴のロード
  useEffect(() => {
    setHistoryItems(clientStore.getHistory(client.id));
  }, [client.id]);

  // 種別（reach / main）でフィルタリング
  const filteredRows = sheetRows.filter((r) => (r.kwType || 'reach') === activeKwType);
  const mainCount = sheetRows.filter((r) => r.kwType === 'main').length;
  const reachCount = sheetRows.filter((r) => (r.kwType || 'reach') === 'reach').length;

  // 選択中の行
  const selectedRow = filteredRows.find((r) => r.id === selectedRowId) || filteredRows[0];

  // 種別切り替え時に選択を先頭にリセット
  useEffect(() => {
    if (filteredRows.length > 0 && (!selectedRowId || !filteredRows.some((r) => r.id === selectedRowId))) {
      setSelectedRowId(filteredRows[0].id);
    }
  }, [activeKwType, sheetRows]);

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

      // 履歴に保存
      const historyItem: KeywordHistoryItem = {
        id: `hist-${Date.now()}`,
        clientId: client.id,
        keyword: selectedRow.mainKeyword,
        day: selectedRow.day,
        kwType: selectedRow.kwType || activeKwType,
        generatedAt: new Date().toISOString(),
      };
      clientStore.addHistoryItem(historyItem);
      setHistoryItems(clientStore.getHistory(client.id));

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
        {/* 見出し ＆ 右側ボタン群（履歴・文献・KW） */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-[#1d1d1f] tracking-tight">
            ブログ記事を生成する
          </h2>

          {/* 右側アクションボタン（履歴・文献・KW） */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* 🕒 履歴ボタン */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="apple-secondary-btn flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium"
            >
              <History className="w-3.5 h-3.5 text-[#0066cc]" />
              <span>履歴 ({historyItems.length})</span>
            </button>

            {/* 📄 文献リンク */}
            {client?.documentUrl && (
              <a
                href={client.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-secondary-btn flex items-center space-x-1 px-3 py-1.5 text-xs font-medium"
              >
                <span>📄 文献</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            {/* 📊 KWリンク */}
            {client?.spreadsheetUrl && (
              <a
                href={client.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-secondary-btn flex items-center space-x-1 px-3 py-1.5 text-xs font-medium"
              >
                <span>📊 KW</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* キーワード種別切り替え（セグメントコントロール） */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#86868b] block">
            キーワード種別
          </label>
          <div className="inline-flex p-1 bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveKwType('reach')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1 ${
                activeKwType === 'reach'
                  ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <span>🔗 リーチキーワード ({reachCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveKwType('main')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1 ${
                activeKwType === 'main'
                  ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <span>🎯 メインキーワード ({mainCount})</span>
            </button>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-[#86868b] bg-[#f5f5f7] rounded-xl border border-[#e5e5ea]">
            <p className="text-xs">選択中の種別のキーワードがありません。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* キーワード名プルダウン選択（Day表記付き） */}
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
                  {filteredRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.day ? `Day ${row.day}: ` : ''}{row.mainKeyword}
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

            {/* 生成ボタン */}
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

      {/* 履歴モーダル */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyItems={historyItems}
        onSelectKeyword={(kw) => {
          const found = sheetRows.find((r) => r.mainKeyword === kw);
          if (found) {
            setActiveKwType(found.kwType || 'reach');
            setSelectedRowId(found.id);
          }
        }}
      />
    </div>
  );
};
