'use client';

import React, { useState } from 'react';
import { BlogDraft, Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { 
  Table, 
  Sparkles, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  Upload, 
  Plus, 
  Trash2, 
  ChevronRight,
  ClipboardPaste,
  ShieldAlert
} from 'lucide-react';

interface SheetKeywordManagerProps {
  client: Client;
  sheetRows: KeywordSheetRow[];
  knowledges: KnowledgeItem[];
  prompts: PromptTemplate[];
  apiKey: string;
  onUpdateSheetRows: (rows: KeywordSheetRow[]) => void;
  onGenerateSuccess: (draft: BlogDraft) => void;
  onOpenDraft: (draftId: string) => void;
}

export const SheetKeywordManager: React.FC<SheetKeywordManagerProps> = ({
  client,
  sheetRows,
  knowledges,
  prompts,
  apiKey,
  onUpdateSheetRows,
  onGenerateSuccess,
  onOpenDraft,
}) => {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [generatingRowId, setGeneratingRowId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const activePrompt = prompts.find((p) => p.type === client.promptType) || prompts[0];
  const clientKnowledges = knowledges.filter((k) => k.clientId === client.id);

  // スプレッドシートからのコピペ / CSVテキストのパース
  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    try {
      const lines = importText.trim().split(/\r?\n/);
      const parsedRows: KeywordSheetRow[] = [];

      lines.forEach((line, index) => {
        // タブ区切りまたはカンマ区切りで分割
        let cols = line.split('\t');
        if (cols.length <= 2) {
          cols = line.split(',');
        }

        const trimmedCols = cols.map((c) => c.trim().replace(/^["']|["']$/g, ''));

        // ヘッダー行をスキップ
        if (index === 0 && (trimmedCols[0]?.includes('Day') || trimmedCols[3]?.includes('メインKW') || trimmedCols[0]?.includes('メインKW'))) {
          return;
        }

        if (trimmedCols.length >= 4) {
          // 提供されたスプレッドシートの標準列構造に対応
          // Day(0), 役割(1), カテゴリ(2), メインKW(3), リーチKW(4), 検索意図(5), 想定読者(6), 結論(7), 重複チェック(8)
          let day = trimmedCols[0] || '';
          let role = trimmedCols[1] || '';
          let category = trimmedCols[2] || '';
          let mainKW = trimmedCols[3] || trimmedCols[0];
          let reachKW = trimmedCols[4] || '';
          let searchIntent = trimmedCols[5] || '';
          let targetAudience = trimmedCols[6] || '';
          let conclusion = trimmedCols[7] || '';
          let uniquePoint = trimmedCols[8] || '';

          // 短い形式（メインKW, 検索意図, 読者, 結論 の4列形式など）にも自動対応
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
              role,
              category,
              mainKeyword: mainKW,
              reachKeyword: reachKW,
              searchIntent: searchIntent || `${mainKW}に関する読者の疑問・不安`,
              targetAudience: targetAudience || '転職やサービス検討中のユーザー',
              conclusion: conclusion || `${mainKW}の正しい判断基準と要点`,
              uniquePoint: uniquePoint || '',
              status: 'pending',
            });
          }
        }
      });

      if (parsedRows.length === 0) {
        throw new Error('行を正しく読み取れませんでした。スプレッドシートの範囲をコピーして貼り付けてください。');
      }

      const newRows = [...parsedRows, ...sheetRows];
      onUpdateSheetRows(newRows);
      setImportText('');
      setIsImportOpen(false);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 1行を選んで1記事生成
  const handleGenerateRow = async (row: KeywordSheetRow) => {
    setGeneratingRowId(row.id);
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
            sheetRow: row,
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
        sheetRowId: row.id,
        keyword: row.mainKeyword,
        subKeywords: [row.reachKeyword].filter(Boolean) as string[],
        promptType: client.promptType,
        title: json.data.title,
        contentMarkdown: json.data.contentMarkdown,
        metaDescription: json.data.metaDescription,
        suggestedTags: json.data.suggestedTags,
        usedKnowledgeIds: json.data.usedKnowledgeIds,
        factCheck: json.data.factCheck,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 行のステータスを更新
      const updatedRows = sheetRows.map((r) =>
        r.id === row.id ? { ...r, status: 'generated' as const, draftId: draft.id } : r
      );
      onUpdateSheetRows(updatedRows);

      onGenerateSuccess(draft);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setGeneratingRowId(null);
    }
  };

  const handleDeleteRow = (id: string) => {
    onUpdateSheetRows(sheetRows.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* 上部ヘッダー */}
      <div className="apple-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Table className="w-5 h-5 text-[#0066cc]" />
            <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
              キーワード設計表（スプレッドシート連携）
            </h2>
          </div>
          <p className="text-xs text-[#86868b] mt-1">
            スプレッドシートから読み込んだ設計表です。行ごとに【記事を生成】を押すだけで、文献要約に基づいた下書きが完成します。
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsImportOpen(!isImportOpen)}
            className="apple-pill-btn flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold shadow-sm"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>スプシからコピペ追加</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* コピペインポートモーダル/エリア */}
      {isImportOpen && (
        <form onSubmit={handleImport} className="apple-card p-6 space-y-4 border-2 border-[#0066cc]/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center space-x-1.5">
              <Upload className="w-4 h-4 text-[#0066cc]" />
              <span>スプレッドシートの行をコピー＆ペースト</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="text-xs text-[#86868b] hover:text-[#1d1d1f]"
            >
              閉じる
            </button>
          </div>

          <p className="text-xs text-[#86868b]">
            Googleスプレッドシートのセル（ヘッダーまたはデータ行）をそのままコピーして下に貼り付けてください。列（メインKW・検索意図・想定読者・記事の結論・重複チェック1文など）を自動認識します。
          </p>

          <textarea
            rows={5}
            placeholder={`スプレッドシートからコピーしたデータをここにペースト...`}
            className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl p-3 text-xs text-[#1d1d1f] font-mono focus:outline-none focus:bg-white focus:border-[#0066cc]"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            required
          />

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="apple-secondary-btn px-4 py-1.5 text-xs font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="apple-pill-btn px-5 py-1.5 text-xs font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>一覧に取り込む</span>
            </button>
          </div>
        </form>
      )}

      {/* キーワード設計表一覧 */}
      {sheetRows.length === 0 ? (
        <div className="apple-card p-12 text-center text-[#86868b] border-dashed">
          <Table className="w-10 h-10 mx-auto mb-2 text-[#d2d2d7]" />
          <p className="text-sm font-semibold text-[#1d1d1f]">キーワード設計表が空です</p>
          <p className="text-xs text-[#86868b] mt-1 mb-4">
            「スプシからコピペ追加」ボタンからスプレッドシートの行を取り込んでください。
          </p>
          <button
            onClick={() => setIsImportOpen(true)}
            className="apple-pill-btn px-4 py-2 text-xs font-semibold"
          >
            スプレッドシートを取り込む
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sheetRows.map((row) => (
            <div
              key={row.id}
              className={`apple-card p-5 transition hover:border-[#0066cc]/40 ${
                row.status === 'generated' ? 'bg-[#fafafc]' : 'bg-white'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* 左側: メイン情報 */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.day && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1d1d1f] text-white">
                        Day {row.day}
                      </span>
                    )}
                    {row.role && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f5f5f7] border border-[#e5e5ea] text-[#86868b] font-medium">
                        {row.role}記事
                      </span>
                    )}
                    {row.category && (
                      <span className="text-[11px] text-[#86868b]">
                        [{row.category}]
                      </span>
                    )}
                    <h3 className="text-base font-bold text-[#1d1d1f] tracking-tight">
                      {row.mainKeyword}
                    </h3>
                  </div>

                  {/* 検索意図 & 想定読者 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#515154] bg-[#f5f5f7] p-3 rounded-xl border border-[#e5e5ea]">
                    <div>
                      <strong className="text-[#1d1d1f] block mb-0.5">👤 想定読者（ペルソナ）:</strong>
                      <p className="line-clamp-2 leading-relaxed">{row.targetAudience}</p>
                    </div>
                    <div>
                      <strong className="text-[#1d1d1f] block mb-0.5">💡 記事の結論:</strong>
                      <p className="line-clamp-2 leading-relaxed">{row.conclusion}</p>
                    </div>
                  </div>

                  {/* 重複チェック1文 */}
                  {row.uniquePoint && (
                    <div className="text-[11px] text-[#0066cc] flex items-center space-x-1 font-medium">
                      <span>✨ 差別化の軸:</span>
                      <span className="truncate">{row.uniquePoint}</span>
                    </div>
                  )}
                </div>

                {/* 右側: アクションボタン */}
                <div className="flex items-center space-x-2 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    className="p-2 text-[#86868b] hover:text-rose-600 rounded-full transition"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {row.status === 'generated' && row.draftId ? (
                    <button
                      onClick={() => onOpenDraft(row.draftId!)}
                      className="apple-secondary-btn flex items-center space-x-1 px-4 py-2 text-xs font-semibold text-[#0066cc]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                      <span>下書きを見る</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGenerateRow(row)}
                      disabled={generatingRowId === row.id}
                      className="apple-pill-btn flex items-center space-x-1.5 px-5 py-2.5 text-xs font-semibold shadow-sm disabled:opacity-50"
                    >
                      {generatingRowId === row.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>執筆中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>この記事を生成</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
