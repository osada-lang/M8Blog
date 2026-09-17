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

  // URLスクレイピングハンドラ
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

    // リセット
    setTitle('');
    setContent('');
    setUrl('');
    setTagsInput('');
    setScrapeError('');
  };

  const getSourceIcon = (type: KnowledgeSourceType) => {
    switch (type) {
      case 'url':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'gbp':
        return <MapPin className="w-4 h-4 text-emerald-400" />;
      case 'sns':
        return <Share2 className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 上部ヘッダー */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">
                {client.name} の「頭脳」（ナレッジベース）
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              ブログ記事生成時に参照する公式資料・HP・GBP情報です。ここに登録されたデータのみを根拠に執筆するため、ハルシネーション（嘘の創作）を防ぐことができます。
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-indigo-400">{clientKnowledges.length}</span>
            <span className="text-xs text-slate-400 block">登録ナレッジ数</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ナレッジ追加フォーム */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-md font-semibold text-white mb-4 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>新しいナレッジ（資料）を追加</span>
          </h3>

          {/* ソース種別タブ */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg mb-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`py-2 rounded-md flex items-center justify-center space-x-1 transition ${
                activeTab === 'text' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>資料・テキスト</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`py-2 rounded-md flex items-center justify-center space-x-1 transition ${
                activeTab === 'url' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>HP・URL抽出</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gbp')}
              className={`py-2 rounded-md flex items-center justify-center space-x-1 transition ${
                activeTab === 'gbp' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>GBP (マップ)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sns')}
              className={`py-2 rounded-md flex items-center justify-center space-x-1 transition ${
                activeTab === 'sns' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>SNS・口コミ</span>
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            {/* URL入力とスクレイピングボタン */}
            {activeTab === 'url' && (
              <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <label className="text-xs font-medium text-slate-300">対象のWebサイトURL</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    placeholder="https://example-clinic.com/service"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleScrape}
                    disabled={isScraping || !url}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center space-x-1 transition"
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
                {scrapeError && <p className="text-xs text-rose-400 mt-1">{scrapeError}</p>}
              </div>
            )}

            {/* タイトル */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                資料タイトル / 項目名 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  activeTab === 'gbp'
                    ? '例: Googleビジネスプロフィールの口コミ傾向・店舗案内'
                    : '例: 施術メニュー・特徴・料金補足'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* 本文 */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                ナレッジ内容（テキスト） <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={7}
                placeholder={`記事生成時に参照する具体的な情報を箇条書きや文章で入力してください。\n（例: こだわり、施術の流れ、注意事項、設備、よくある質問など）`}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {/* タグ */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">タグ（カンマ区切り）</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500 mr-2" />
                <input
                  type="text"
                  placeholder="例: レーザー治療, 初診案内, Q&A"
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>頭脳（ナレッジ）に登録する</span>
            </button>
          </form>
        </div>

        {/* 登録済みナレッジ一覧 */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-md font-semibold text-white flex items-center justify-between">
            <span>登録済みナレッジ一覧</span>
            <span className="text-xs text-slate-400">
              ※ キーワードに応じて関連するナレッジが自動選定されます
            </span>
          </h3>

          {clientKnowledges.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <BrainCircuit className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium">まだナレッジが登録されていません</p>
              <p className="text-xs text-slate-500 mt-1">
                左側のフォームからHPや店舗資料のテキストを登録してください。
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {clientKnowledges.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 rounded-md bg-slate-800 border border-slate-700">
                        {getSourceIcon(item.sourceType)}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:underline flex items-center space-x-1 mt-0.5"
                          >
                            <span>{item.sourceUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteKnowledge(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 本文プレビュー */}
                  <p className="text-xs text-slate-300 mt-3 line-clamp-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                    {item.content}
                  </p>

                  {/* タグ & 作成日 */}
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500">
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
