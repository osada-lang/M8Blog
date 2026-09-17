'use client';

import React, { useState, useEffect } from 'react';
import { BlogDraft, Client, KnowledgeItem, PromptTemplate } from '@/types';
import { clientStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { KnowledgeManager } from '@/components/KnowledgeManager';
import { PromptManager } from '@/components/PromptManager';
import { ArticleGenerator } from '@/components/ArticleGenerator';
import { DraftEditor } from '@/components/DraftEditor';
import { DraftList } from '@/components/DraftList';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { ClientModal } from '@/components/ClientModal';
import { Sparkles, BrainCircuit, Terminal, FileText, ArrowLeft, Loader2 } from 'lucide-react';

type MainTab = 'generate' | 'knowledge' | 'prompts' | 'drafts' | 'editor';

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [knowledges, setKnowledges] = useState<KnowledgeItem[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<BlogDraft | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('generate');
  const [apiKey, setApiKey] = useState('');

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 初期化ロード
  useEffect(() => {
    const loadedClients = clientStore.getClients();
    const loadedKnowledges = clientStore.getKnowledges();
    const loadedPrompts = clientStore.getPrompts();
    const loadedDrafts = clientStore.getDrafts();
    const loadedApiKey = clientStore.getApiKey();

    setClients(loadedClients);
    if (loadedClients.length > 0) {
      setSelectedClient(loadedClients[0]);
    }
    setKnowledges(loadedKnowledges);
    setPrompts(loadedPrompts);
    setDrafts(loadedDrafts);
    setApiKey(loadedApiKey);
    setMounted(true);
  }, []);

  if (!mounted || !selectedClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // クライアント切り替え
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    // クライアントを切り替えたら生成タブに戻る
    if (activeTab === 'editor') {
      setActiveTab('generate');
      setActiveDraft(null);
    }
  };

  // ナレッジ追加
  const handleAddKnowledge = (newItem: Omit<KnowledgeItem, 'id' | 'createdAt'>) => {
    const item: KnowledgeItem = {
      ...newItem,
      id: `know-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [item, ...knowledges];
    setKnowledges(updated);
    clientStore.saveKnowledges(updated);
  };

  // ナレッジ削除
  const handleDeleteKnowledge = (id: string) => {
    const updated = knowledges.filter((k) => k.id !== id);
    setKnowledges(updated);
    clientStore.saveKnowledges(updated);
  };

  // プロンプト保存
  const handleSavePrompts = (newPrompts: PromptTemplate[]) => {
    setPrompts(newPrompts);
    clientStore.savePrompts(newPrompts);
  };

  // 記事生成完了
  const handleGenerateSuccess = (draft: BlogDraft) => {
    setActiveDraft(draft);
    const updated = [draft, ...drafts];
    setDrafts(updated);
    clientStore.saveDraft(draft);
    setActiveTab('editor');
  };

  // 下書き更新
  const handleUpdateDraft = (updated: BlogDraft) => {
    setActiveDraft(updated);
    clientStore.saveDraft(updated);
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  // 下書き削除
  const handleDeleteDraft = (id: string) => {
    clientStore.deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    if (activeDraft?.id === id) {
      setActiveDraft(null);
      setActiveTab('drafts');
    }
  };

  // ファクトチェック手動再検証
  const handleRecheckFact = async () => {
    if (!activeDraft) return;
    setIsRechecking(true);
    try {
      const clientK = knowledges.filter((k) => k.clientId === activeDraft.clientId);
      const res = await fetch('/api/factcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: activeDraft.contentMarkdown,
          knowledges: clientK,
          promptType: activeDraft.promptType,
          apiKey,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const updated: BlogDraft = {
          ...activeDraft,
          factCheck: json.data,
          updatedAt: new Date().toISOString(),
        };
        handleUpdateDraft(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRechecking(false);
    }
  };

  // クライアント追加
  const handleAddClient = (newClient: Client) => {
    const updated = [...clients, newClient];
    setClients(updated);
    clientStore.saveClients(updated);
    setSelectedClient(newClient);
    setActiveTab('generate');
  };

  // APIキー保存
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    clientStore.saveApiKey(key);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ヘッダー */}
      <Header
        clients={clients}
        selectedClient={selectedClient}
        onSelectClient={handleSelectClient}
        onOpenNewClientModal={() => setIsClientModalOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasApiKey={!!apiKey}
      />

      {/* メインコンテナ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* タブナビゲーション */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'generate'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>記事生成</span>
            </button>

            {activeDraft && (
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'editor'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-indigo-400 hover:text-indigo-300 hover:bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>下書きエディタ・検証</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'knowledge'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>クライアント頭脳 ({knowledges.filter((k) => k.clientId === selectedClient.id).length})</span>
            </button>

            <button
              onClick={() => setActiveTab('prompts')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'prompts'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>プロンプト設定</span>
            </button>

            <button
              onClick={() => setActiveTab('drafts')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'drafts'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>履歴・下書き ({drafts.filter((d) => d.clientId === selectedClient.id).length})</span>
            </button>
          </div>

          {/* 現在選択中のクライアント情報 */}
          <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-400">
            <span>対象: <strong className="text-slate-200">{selectedClient.name}</strong></span>
            <span>({selectedClient.industry})</span>
          </div>
        </div>

        {/* タブコンテンツ */}
        <div className="mt-6">
          {activeTab === 'generate' && (
            <ArticleGenerator
              client={selectedClient}
              knowledges={knowledges}
              prompts={prompts}
              apiKey={apiKey}
              onGenerateSuccess={handleGenerateSuccess}
            />
          )}

          {activeTab === 'editor' && activeDraft && (
            <div>
              <button
                onClick={() => setActiveTab('drafts')}
                className="mb-4 text-xs text-slate-400 hover:text-white flex items-center space-x-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>下書き一覧に戻る</span>
              </button>
              <DraftEditor
                draft={activeDraft}
                knowledges={knowledges}
                onUpdateDraft={handleUpdateDraft}
                onRecheckFact={handleRecheckFact}
                isRechecking={isRechecking}
              />
            </div>
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeManager
              client={selectedClient}
              knowledges={knowledges}
              onAddKnowledge={handleAddKnowledge}
              onDeleteKnowledge={handleDeleteKnowledge}
            />
          )}

          {activeTab === 'prompts' && (
            <PromptManager
              prompts={prompts}
              onSavePrompts={handleSavePrompts}
            />
          )}

          {activeTab === 'drafts' && (
            <DraftList
              client={selectedClient}
              drafts={drafts}
              onSelectDraft={(draft) => {
                setActiveDraft(draft);
                setActiveTab('editor');
              }}
              onDeleteDraft={handleDeleteDraft}
              onCreateNew={() => setActiveTab('generate')}
            />
          )}
        </div>
      </main>

      {/* モーダル */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onAddClient={handleAddClient}
      />
    </div>
  );
}
