'use client';

import React, { useState } from 'react';
import { BlogDraft, KnowledgeItem } from '@/types';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Copy, 
  Check, 
  Download, 
  FileEdit, 
  Eye, 
  BookOpen
} from 'lucide-react';

interface DraftEditorProps {
  draft: BlogDraft;
  knowledges: KnowledgeItem[];
  onUpdateDraft: (updated: BlogDraft) => void;
  onRecheckFact?: () => void;
  isRechecking?: boolean;
}

/**
 * Markdown記号や改行・空白を除去して「純粋な本文の日本語文字数」をカウントする関数
 */
function countPlainTextCharacters(markdown: string): number {
  if (!markdown) return 0;

  const plainText = markdown
    // 見出しタグ (#, ##, ### 等) を削除
    .replace(/^#{1,6}\s+/gm, '')
    // 太字・斜体 (**, *, __, _) を削除
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // リンク [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 画像 ![alt](url) -> 削除
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // 引用 (>) を削除
    .replace(/^>\s+/gm, '')
    // 箇条書き (- , * , 1. ) を削除
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // 表の罫線 (|---|---|) を削除
    .replace(/\|[-:\s|]+\|/g, '')
    .replace(/\|/g, ' ')
    // 水平線 (---, ***) を削除
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // コードブロック (```...```) を削除
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // 空白・改行・タブをすべて除去
    .replace(/\s+/g, '');

  return plainText.length;
}

/**
 * Markdownテキストを実際のブログHTML風に美しく描画するリッチプレビューコンポーネント
 */
const RichBlogRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
  const lines = markdown.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableHeader.length > 0 || tableRows.length > 0) {
      renderedElements.push(
        <div key={key} className="my-6 overflow-x-auto rounded-xl border border-[#e5e5ea] bg-white shadow-sm">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            {tableHeader.length > 0 && (
              <thead className="bg-[#f5f5f7] border-b border-[#e5e5ea] text-[#1d1d1f] font-semibold">
                <tr>
                  {tableHeader.map((th, i) => (
                    <th key={i} className="p-3 sm:p-3.5 border-r border-[#e5e5ea] last:border-r-0">
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-[#e5e5ea]">
              {tableRows.map((tr, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#fafafc] transition">
                  {tr.map((td, cIdx) => (
                    <td key={cIdx} className="p-3 sm:p-3.5 border-r border-[#e5e5ea] last:border-r-0 text-[#515154] leading-relaxed">
                      {td}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // テーブルの判定
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cols = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      // 罫線行 (|---|---|) はスキップ
      if (cols.every((c) => /^[-:\s]+$/.test(c))) {
        inTable = true;
        return;
      }
      if (!inTable) {
        tableHeader = cols;
        inTable = true;
      } else {
        tableRows.push(cols);
      }
      return;
    } else if (inTable) {
      flushTable(`table-${index}`);
    }

    if (!trimmed) {
      return;
    }

    // H1 見出し
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h1 key={index} className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] tracking-tight leading-tight mt-6 mb-4 pb-3 border-b-2 border-[#1d1d1f]">
          {trimmed.replace(/^#\s+/, '')}
        </h1>
      );
      return;
    }

    // H2 見出し
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h2 key={index} className="text-lg sm:text-xl font-bold text-[#1d1d1f] tracking-tight mt-8 mb-3.5 pl-3 border-l-4 border-[#0066cc]">
          {trimmed.replace(/^##\s+/, '')}
        </h2>
      );
      return;
    }

    // H3 見出し
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h3 key={index} className="text-base sm:text-lg font-semibold text-[#1d1d1f] mt-6 mb-2.5">
          {trimmed.replace(/^###\s+/, '')}
        </h3>
      );
      return;
    }

    // 水平線
    if (/^[-*_]{3,}$/.test(trimmed)) {
      renderedElements.push(<hr key={index} className="my-6 border-t border-[#e5e5ea]" />);
      return;
    }

    // 引用ブロック (>)
    if (trimmed.startsWith('>')) {
      renderedElements.push(
        <blockquote key={index} className="my-4 p-4 rounded-xl bg-[#f5f5f7] border-l-4 border-[#86868b] text-[#515154] text-xs sm:text-sm leading-relaxed italic">
          {trimmed.replace(/^>\s*/, '')}
        </blockquote>
      );
      return;
    }

    // 箇条書きリスト
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      renderedElements.push(
        <li key={index} className="ml-5 list-disc text-xs sm:text-sm text-[#515154] leading-relaxed my-1">
          <span dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^[-*]\s+/, '')) }} />
        </li>
      );
      return;
    }

    // 通常段落
    renderedElements.push(
      <p key={index} className="text-xs sm:text-sm text-[#333336] leading-relaxed my-3" dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
    );
  });

  if (inTable) {
    flushTable('table-end');
  }

  return <div className="space-y-1">{renderedElements}</div>;
};

function formatInline(text: string): string {
  return text
    // 太字 **text** -> <strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#1d1d1f]">$1</strong>')
    // リンク [text](url) -> <a>
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#0066cc] hover:underline font-medium">$1</a>');
}

export const DraftEditor: React.FC<DraftEditorProps> = ({
  draft,
  knowledges,
  onUpdateDraft,
  onRecheckFact,
  isRechecking = false,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [copied, setCopied] = useState(false);

  const factCheck = draft.factCheck;
  const plainCharCount = countPlainTextCharacters(draft.contentMarkdown);

  const handleContentChange = (newContent: string) => {
    onUpdateDraft({
      ...draft,
      contentMarkdown: newContent,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(draft.contentMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([draft.contentMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${draft.title.replace(/[\s/\\?%*:|"<>]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        label: '極めて高精度',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />,
      };
    }
    if (score >= 70) {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-800',
        label: '確認推奨箇所あり',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 mr-1.5" />,
      };
    }
    return {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      label: '要修正（リスクあり）',
      icon: <ShieldAlert className="w-4 h-4 text-rose-600 mr-1.5" />,
    };
  };

  const scoreInfo = factCheck ? getScoreBadge(factCheck.score) : null;

  return (
    <div className="space-y-6">
      {/* 記事タイトル & 操作ヘッダー */}
      <div className="apple-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f5f5f7] border border-[#e5e5ea] text-[#0066cc] font-medium">
              {draft.keyword}
            </span>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1d1d1f] tracking-tight">{draft.title}</h2>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopyMarkdown}
              className="apple-secondary-btn flex items-center space-x-1.5 px-3.5 sm:px-4 py-1.5 text-xs font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'コピー完了' : 'Markdownコピー'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="apple-secondary-btn flex items-center space-x-1.5 px-3.5 sm:px-4 py-1.5 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.md保存</span>
            </button>
          </div>
        </div>

        {/* ファクトチェックスコアバー */}
        {factCheck && (
          <div className="mt-4 pt-4 border-t border-[#e5e5ea] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className={`flex items-center text-xs px-3 py-1 rounded-full border font-semibold ${scoreInfo?.bg}`}>
                {scoreInfo?.icon}
                <span>ファクト信頼度: {factCheck.score}点</span>
              </div>
              <span className="text-xs text-[#86868b]">
                （指摘: {factCheck.totalIssues}件）
              </span>
            </div>
            <p className="text-xs text-[#86868b]">
              {factCheck.summary}
            </p>
          </div>
        )}
      </div>

      {/* メインビュー */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左側: 記事本文 */}
        <div className="lg:col-span-8 space-y-4">
          {/* 切り替えバー ＆ 正確な純テキスト文字数表示 */}
          <div className="flex items-center justify-between apple-card px-4 py-2.5">
            <div className="flex items-center space-x-1 bg-[#f5f5f7] p-1 rounded-full border border-[#e5e5ea] text-xs font-medium">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3.5 py-1 rounded-full flex items-center space-x-1 transition ${
                  viewMode === 'preview' ? 'apple-pill-btn' : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ブログ表示プレビュー</span>
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3.5 py-1 rounded-full flex items-center space-x-1 transition ${
                  viewMode === 'edit' ? 'apple-pill-btn' : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Markdown直接編集</span>
              </button>
            </div>

            {/* 本文実文字数（Markdown記号・空白除外） */}
            <div className="text-right">
              <span className="text-xs font-semibold text-[#1d1d1f]">
                本文実文字数: <strong className="text-[#0066cc]">{plainCharCount.toLocaleString()}</strong> 文字
              </span>
            </div>
          </div>

          {/* 本文エリア */}
          {viewMode === 'preview' ? (
            <div className="apple-card p-6 sm:p-9 text-[#1d1d1f] bg-white">
              {/* ブログ本番風のリッチレンダラー */}
              <RichBlogRenderer markdown={draft.contentMarkdown} />
            </div>
          ) : (
            <textarea
              rows={26}
              className="w-full apple-card p-4 sm:p-5 text-xs sm:text-sm text-[#1d1d1f] font-mono leading-relaxed focus:outline-none focus:border-[#0066cc]"
              value={draft.contentMarkdown}
              onChange={(e) => handleContentChange(e.target.value)}
            />
          )}

          {/* メタ情報 */}
          <div className="apple-card p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              記事メタ情報（LLMO / SEO設定）
            </h3>
            <div>
              <span className="text-xs font-medium text-[#86868b] block mb-1">メタディスクリプション:</span>
              <p className="text-xs text-[#1d1d1f] bg-[#f5f5f7] p-2.5 rounded-xl border border-[#e5e5ea]">
                {draft.metaDescription || '未設定'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-[#86868b] block mb-1">推奨タグ:</span>
              <div className="flex flex-wrap gap-1.5">
                {draft.suggestedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#e5e5ea]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右側: ファクトチェック指摘 */}
        <div className="lg:col-span-4 space-y-4">
          <div className="apple-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0066cc]" />
                <span>検証結果詳細</span>
              </h3>
              {onRecheckFact && (
                <button
                  onClick={onRecheckFact}
                  disabled={isRechecking}
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  {isRechecking ? '再検証中...' : '再検証'}
                </button>
              )}
            </div>

            {!factCheck || factCheck.issues.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <Check className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-emerald-800">リスク表現は検出されませんでした</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  元文献データに忠実で、創作・誇大広告の懸念はありません。
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {factCheck.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      issue.severity === 'high'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : issue.severity === 'medium'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          issue.severity === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : issue.severity === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-white text-[#1d1d1f] border border-[#e5e5ea]'
                        }`}
                      >
                        {issue.type === 'medical_law_risk'
                          ? '🏥 薬機法/医療広告'
                          : issue.type === 'hallucination_suspect'
                          ? '⚠️ ハルシネーション'
                          : '📝 要確認事項'}
                      </span>
                      <span className="text-[10px] text-[#86868b]">
                        {issue.severity === 'high' ? '重大' : issue.severity === 'medium' ? '警告' : '確認'}
                      </span>
                    </div>

                    <div className="font-mono text-xs bg-white p-2 rounded-lg border border-[#e5e5ea]">
                      &quot;{issue.highlightText}&quot;
                    </div>

                    <p className="text-[11px] leading-relaxed">
                      {issue.reason}
                    </p>

                    {issue.suggestion && (
                      <div className="text-[11px] text-[#0066cc] bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <span className="font-semibold block">💡 修正アドバイス:</span>
                        {issue.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 参照された文献 */}
          <div className="apple-card p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#0066cc]" />
              <span>根拠として参照された文献データ</span>
            </h3>
            {draft.usedKnowledgeIds.length === 0 ? (
              <p className="text-xs text-[#86868b]">文献の参照はありません</p>
            ) : (
              <ul className="space-y-2">
                {knowledges
                  .filter((k) => draft.usedKnowledgeIds.includes(k.id))
                  .map((k) => (
                    <li
                      key={k.id}
                      className="text-xs bg-[#f5f5f7] p-2.5 rounded-xl border border-[#e5e5ea] text-[#1d1d1f]"
                    >
                      <span className="font-semibold block truncate">{k.title}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
