'use client';

import React, { useState } from 'react';
import { BlogDraft, Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { 
  Sparkles, 
  Loader2, 
  ExternalLink, 
  Upload, 
  Plus, 
  ChevronDown,
  Trash2,
  FileText
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
  onUpdateSheetRows,
}) => {
  const [selectedRowId, setSelectedRowId] = useState<string>(sheetRows[0]?.id || '');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<BlogDraft | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 選択中の孫記事
  const selectedRow = sheetRows.find((r) => r.id === selectedRowId) || sheetRows[0];
  const activePrompt = prompts.find((p) => p.type === client.promptType) || prompts[0];
  const clientKnowledges = knowledges.filter((k) => k.clientId === client.id);

  // スプレッドシートからコピペインポート（B列が「孫」の行のみ自動抽出）
  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    try {
      const lines = importText.trim().split(/\r?\n/);
      const parsedRows: KeywordSheetRow[] = [];

      lines.forEach((line) => {
        let cols = line.split('\t');
        if (cols.length <= 2) {
          cols = line.split(',');
        }
        const trimmedCols = cols.map((c) => c.trim().replace(/^["']|["']$/g, ''));

        // ヘッダー行をスキップ
        if (trimmedCols[0]?.includes('Day') || trimmedCols[3]?.includes('メインKW')) {
          return;
        }

        // B列（インデックス1）が「孫」の行のみを抽出
        // もし行が短くてB列がない場合は全行抽出
        const role = trimmedCols[1] || '孫';
        const isGrandchild = role === '孫' || trimmedCols.length < 5;

        if (isGrandchild && trimmedCols.length >= 3) {
          let day = trimmedCols[0] || '';
          let category = trimmedCols[2] || '';
          let mainKW = trimmedCols[3] || trimmedCols[0];
          let reachKW = trimmedCols[4] || '';
          let searchIntent = trimmedCols[5] || '';
          let targetAudience = trimmedCols[6] || '';
          let conclusion = trimmedCols[7] || '';
          let uniquePoint = trimmedCols[8] || '';

          if (!searchIntent && trimmedCols.length >= 3) {
            mainKW = trimmedCols[0];
            searchIntent = trimmedCols[1];
            targetAudience = trimmedCols[2];
            conclusion = trimmedCols[3] || '';
          }

          if (mainKW) {
            parsedRows.push({
              id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              day,
              role: '孫',
              category,
              mainKeyword: mainKW,
              reachKeyword: reachKW,
              searchIntent: searchIntent || `${mainKW}に関する読者の疑問・不安`,
              targetAudience: targetAudience || '転職やサービス検討中のユーザー',
              conclusion: conclusion || `${mainKW}の正しい判断基準と要点`,
              uniquePoint: uniquePoint || '',
            });
          }
        }
      });

      if (parsedRows.length === 0) {
        throw new Error('B列が「孫」に該当する行が見つかりませんでした。スプレッドシートの範囲をご確認ください。');
      }

      const newRows = [...parsedRows, ...sheetRows];
      onUpdateSheetRows(newRows);
      setSelectedRowId(newRows[0].id);
      setImportText('');
      setIsImportOpen(false);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

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
        subKeywords: [selectedRow.reachKeyword].filter(Boolean) as string[],
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
      {/* 操作パネル（超スッキリ設計） */}
      <div className="apple-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5ea] pb-4">
          <div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1d1d1f] text-white">
              孫記事専用
            </span>
            <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight mt-1.5">
              ブログ記事を生成する
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {client.spreadsheetUrl && (
              <a
                href={client.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-secondary-btn flex items-center space-x-1 px-3 py-1.5 text-xs font-medium"
              >
                <span>スプシを開く</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => setIsImportOpen(!isImportOpen)}
              className="apple-secondary-btn flex items-center space-x-1 px-3 py-1.5 text-xs font-medium"
            >
              <Upload className="w-3 h-3" />
              <span>スプシ取込</span>
            </button>
          </div>
        </div>

        {/* スプシ取込ドロワー */}
        {isImportOpen && (
          <form onSubmit={handleImport} className="p-4 bg-[#f5f5f7] rounded-2xl border border-[#e5e5ea] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1d1d1f]">スプレッドシートの行を貼り付け（B列=「孫」のみ自動抽出）</span>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="text-xs text-[#86868b] hover:text-[#1d1d1f]"
              >
                閉じる
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="スプレッドシートからコピーしたセルをここにペースト..."
              className="w-full bg-white border border-[#d2d2d7] rounded-xl p-3 text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-[#0066cc]"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <button type="submit" className="apple-pill-btn px-4 py-1.5 text-xs font-semibold">
                孫記事を追加
              </button>
            </div>
          </form>
        )}

        {/* キーワード名プルダウン選択 */}
        {sheetRows.length === 0 ? (
          <div className="p-6 text-center text-[#86868b]">
            <p className="text-xs">対象の孫記事キーワードがありません。「スプシ取込」から貼り付けてください。</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#1d1d1f] block mb-1.5">
                執筆するキーワードを選択（孫記事のみ）
              </label>
              <div className="relative">
                <select
                  className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-4 py-3 text-sm font-semibold text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 appearance-none cursor-pointer pr-10"
                  value={selectedRow?.id || ''}
                  onChange={(e) => setSelectedRowId(e.target.value)}
                >
                  {sheetRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.day ? `Day ${row.day}: ` : ''}{row.mainKeyword}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#86868b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 選択されたキーワードの設計プレビュー */}
            {selectedRow && (
              <div className="p-4 bg-[#f5f5f7] rounded-2xl border border-[#e5e5ea] space-y-2 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#86868b] block font-medium">想定読者:</span>
                    <p className="text-[#1d1d1f] mt-0.5 line-clamp-2 leading-relaxed">{selectedRow.targetAudience}</p>
                  </div>
                  <div>
                    <span className="text-[#86868b] block font-medium">記事の結論:</span>
                    <p className="text-[#1d1d1f] mt-0.5 line-clamp-2 leading-relaxed">{selectedRow.conclusion}</p>
                  </div>
                </div>
                {selectedRow.uniquePoint && (
                  <div className="pt-2 border-t border-[#e5e5ea] text-[#0066cc] text-[11px] font-medium">
                    ✨ 差別化の軸: {selectedRow.uniquePoint}
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

      {/* 生成結果エディタ（生成されたら即座に下に表示） */}
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
