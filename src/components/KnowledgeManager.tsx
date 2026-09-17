'use client';

import React, { useState } from 'react';
import { Client, KnowledgeItem, KnowledgeSourceType } from '@/types';
import { 
  BrainCircuit, 
  Plus, 
  Globe, 
  FileText, 
  MapPin, 
  Share2, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  Sparkles,
  Tag
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
  const [activeTab, setActiveTab] = useState<KnowledgeSourceType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  const clientKnowledges = knowledges.filter((k) => k.clientId === client.id);

  const handleScrape = async () => {
    if (!url) return;
    setIsScraping(true);
    setScrapeError('');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'スクレイピングに失敗しました');

      setTitle(json.data.title || `${client.name} 公式HP情報`);
      setContent(
        `【ページ概要】\n${json.data.description}\n\n【見出し一覧】\n${json.data.headings.join('\n')}\n\n【本文抜粋】\n${json.data.textContent}`
      );
      setTagsInput('公式HP, Webサイト');
    } catch (err: any) {
      setScrapeError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const tags = tagsInput
      .split(/[,、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    onAddKnowledge({
      clientId: client.id,
      title,
      sourceType: activeTab,
      sourceUrl: activeTab === 'url' ? url : undefined,
      content,
      tags,
    });

    setTitle('');
    setContent('');
    setUrl('');
    setTagsInput('');
    setScrapeError('');
  };

  const getSourceIcon = (type: KnowledgeSourceType) => {
    switch (type) {
      case 'url':
        return <Globe className="w-4 h-4 text-[#0066cc]" />;
      case 'gbp':
        return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'sns':
        return <Share2 className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 上部カード */}
      <div className="apple-card p-6 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <BrainCircuit className="w-5 h-5 text-[#0066cc]" />
            <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
              {client.name} の頭脳（ナレッジベース）
            </h2>
          </div>
          <p className="text-xs text-[#86868b] mt-1 max-w-2xl leading-relaxed">
            ブログ記事生成時に参照する公式資料・HP・GBP情報です。ここに登録されたデータのみを根拠に執筆するため、ハルシネーション（嘘の創作）を厳格に防ぎます。
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-[#1d1d1f]">{clientKnowledges.length}</span>
          <span className="text-[11px] text-[#86868b] block">登録資料数</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ナレッジ追加フォーム */}
        <div className="lg:col-span-6 apple-card p-6">
          <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center space-x-1.5">
            <Plus className="w-4 h-4 text-[#0066cc]" />
            <span>新しいナレッジ（資料）を追加</span>
          </h3>

          {/* ソース種別タブ */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl mb-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 transition ${
                activeTab === 'text' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>資料</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 transition ${
                activeTab === 'url' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>HP・URL</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gbp')}
              className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 transition ${
                activeTab === 'gbp' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>GBP (マップ)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sns')}
              className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 transition ${
                activeTab === 'sns' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>SNS</span>
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            {activeTab === 'url' && (
              <div className="space-y-2 bg-[#f5f5f7] p-3 rounded-xl border border-[#e5e5ea]">
                <label className="text-xs font-semibold text-[#1d1d1f]">対象のWebサイトURL</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    placeholder="https://example-clinic.com/service"
                    className="flex-1 bg-white border border-[#d2d2d7] rounded-lg px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0066cc]"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleScrape}
                    disabled={isScraping || !url}
                    className="apple-pill-btn px-4 py-2 text-xs font-medium flex items-center space-x-1 disabled:opacity-50"
                  >
                    {isScraping ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>読込中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>自動抽出</span>
                      </>
                    )}
                  </button>
                </div>
                {scrapeError && <p className="text-xs text-rose-600 mt-1">{scrapeError}</p>}
              </div>
            )}

            {/* タイトル */}
            <div>
              <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
                資料タイトル <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  activeTab === 'gbp'
                    ? '例: Googleビジネスプロフィールの口コミ傾向・店舗案内'
                    : '例: 施術メニュー・特徴・料金補足'
                }
                className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* 本文 */}
            <div>
              <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">
                ナレッジ内容（テキスト） <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={6}
                placeholder={`記事生成時に参照する具体的な情報を入力してください。\n（こだわり、施術の流れ、注意事項、よくある質問など）`}
                className="w-full bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg p-3 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0066cc] font-mono leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {/* タグ */}
            <div>
              <label className="text-xs font-semibold text-[#1d1d1f] block mb-1">タグ（カンマ区切り）</label>
              <div className="flex items-center bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg px-3 py-1.5">
                <Tag className="w-3.5 h-3.5 text-[#86868b] mr-2" />
                <input
                  type="text"
                  placeholder="例: レーザー治療, 初診案内, Q&A"
                  className="w-full bg-transparent text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="apple-pill-btn w-full py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>頭脳（ナレッジ）に登録</span>
            </button>
          </form>
        </div>

        {/* 登録済みナレッジ一覧 */}
        <div className="lg:col-span-6 space-y-3">
          <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center justify-between">
            <span>登録済みナレッジ一覧</span>
            <span className="text-[11px] text-[#86868b] font-normal">
              自動関連度マッチング（RAG）
            </span>
          </h3>

          {clientKnowledges.length === 0 ? (
            <div className="apple-card p-10 text-center text-[#86868b] border-dashed">
              <BrainCircuit className="w-8 h-8 mx-auto mb-2 text-[#d2d2d7]" />
              <p className="text-xs font-semibold text-[#1d1d1f]">ナレッジが登録されていません</p>
              <p className="text-[11px] text-[#86868b] mt-1">
                左側のフォームからHPや店舗資料を登録してください。
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {clientKnowledges.map((item) => (
                <div
                  key={item.id}
                  className="apple-card p-4 hover:border-[#0066cc]/40 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 rounded-lg bg-[#f5f5f7] border border-[#e5e5ea]">
                        {getSourceIcon(item.sourceType)}
                      </span>
                      <div>
                        <h4 className="text-xs font-semibold text-[#1d1d1f]">{item.title}</h4>
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#0066cc] hover:underline flex items-center space-x-1 mt-0.5"
                          >
                            <span>{item.sourceUrl}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteKnowledge(item.id)}
                      className="text-[#86868b] hover:text-rose-600 p-1 rounded transition"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#515154] mt-2.5 line-clamp-3 bg-[#f5f5f7] p-2.5 rounded-lg border border-[#e5e5ea] font-mono leading-relaxed">
                    {item.content}
                  </p>

                  <div className="flex items-center justify-between mt-3 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#86868b] border border-[#e5e5ea] text-[10px]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-[#86868b]">
                      {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
