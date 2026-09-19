'use client';

import React, { useState } from 'react';
import { Client, KnowledgeItem } from '@/types';
import { 
  BookOpen, 
  Plus, 
  ExternalLink, 
  Trash2, 
  FileText
} from 'lucide-react';

interface KnowledgeManagerProps {
  client: Client;
  knowledges: KnowledgeItem[];
  onAddKnowledge: (item: Omit<KnowledgeItem, 'id' | 'createdAt'>) => void;
  onDeleteKnowledge: (id: string) => void;
}

export const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({
  client,
  knowledges,
  onAddKnowledge,
  onDeleteKnowledge,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const clientKnowledges = knowledges.filter((k) => k.clientId === client.id);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    onAddKnowledge({
      clientId: client.id,
      title,
      sourceType: 'text',
      content,
      tags: ['文献要約'],
    });

    setTitle('');
    setContent('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 2大外部リンク ＆ 概要ヘッダー */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[#0066cc]" />
            <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
              文献要約集・参考資料
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {client.spreadsheetUrl && (
              <a
                href={client.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-secondary-btn flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium"
              >
                <span>📊 KWスプレッドシート</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {client.documentUrl && (
              <a
                href={client.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-secondary-btn flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium"
              >
                <span>📄 文献要約集ドキュメント</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <p className="text-xs text-[#86868b] leading-relaxed">
          記事生成時にClaudeが根拠として参照するエビデンス・事実データです。ここに登録された情報のみを元に執筆するため、ハルシネーション（嘘の創作）を防ぎます。
        </p>
      </div>

      {/* 追加ボタン / フォーム */}
      {!isAdding ? (
        <div className="flex justify-end">
          <button
            onClick={() => setIsAdding(true)}
            className="apple-pill-btn flex items-center space-x-1 px-4 py-2 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新しい文献要約テキストを追加</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleAdd} className="apple-card p-6 space-y-4 border-2 border-[#0066cc]/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-[#0066cc]" />
              <span>文献要約の追加</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[#86868b] hover:text-[#1d1d1f]"
            >
              閉じる
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
              タイトル / 文献名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="例: 文献要約: 業界歴史とSNS採用の背景"
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
              要約テキスト（エビデンス・事実データ） <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={8}
              placeholder="Googleドキュメント等から文献要約テキストを貼り付けてください..."
              className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl p-3 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc] font-mono leading-relaxed"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="apple-secondary-btn px-4 py-1.5 text-xs font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="apple-pill-btn px-5 py-1.5 text-xs font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>登録する</span>
            </button>
          </div>
        </form>
      )}

      {/* 登録済み文献要約一覧 */}
      <div className="space-y-3">
        {clientKnowledges.length === 0 ? (
          <div className="apple-card p-10 text-center text-[#86868b] border-dashed">
            <FileText className="w-8 h-8 mx-auto mb-2 text-[#d2d2d7]" />
            <p className="text-xs font-semibold text-[#1d1d1f]">文献要約データがありません</p>
            <p className="text-[11px] text-[#86868b] mt-1">
              右上のボタンからGoogleドキュメントの要約テキストを登録してください。
            </p>
          </div>
        ) : (
          clientKnowledges.map((item) => (
            <div key={item.id} className="apple-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[#f5f5f7] border border-[#e5e5ea]">
                    <FileText className="w-4 h-4 text-[#0066cc]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1d1d1f]">{item.title}</h4>
                </div>
                <button
                  onClick={() => onDeleteKnowledge(item.id)}
                  className="text-[#86868b] hover:text-rose-600 p-1 rounded transition"
                  title="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-[#f5f5f7] p-3.5 rounded-xl border border-[#e5e5ea] text-xs text-[#515154] font-mono leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                {item.content}
              </div>

              <div className="text-right text-[10px] text-[#86868b]">
                登録日: {new Date(item.createdAt).toLocaleDateString('ja-JP')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
