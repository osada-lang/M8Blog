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
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center text-[#86868b]">
        <Loader2 className="w-7 h-7 animate-spin text-[#0066cc]" />
      </div>
    );
  }

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    if (activeTab === 'editor') {
      setActiveTab('generate');
      setActiveDraft(null);
    }
  };

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

  const handleDeleteKnowledge = (id: string) => {
    const updated = knowledges.filter((k) => k.id !== id);
    setKnowledges(updated);
    clientStore.saveKnowledges(updated);
  };

  const handleSavePrompts = (newPrompts: PromptTemplate[]) => {
    setPrompts(newPrompts);
    clientStore.savePrompts(newPrompts);
  };

  const handleGenerateSuccess = (draft: BlogDraft) => {
    setActiveDraft(draft);
    const updated = [draft, ...drafts];
    setDrafts(updated);
    clientStore.saveDraft(draft);
    setActiveTab('editor');
  };

  const handleUpdateDraft = (updated: BlogDraft) => {
    setActiveDraft(updated);
    clientStore.saveDraft(updated);
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleDeleteDraft = (id: string) => {
    clientStore.deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    if (activeDraft?.id === id) {
      setActiveDraft(null);
      setActiveTab('drafts');
    }
  };

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

  const handleAddClient = (newClient: Client) => {
    const updated = [...clients, newClient];
    setClients(updated);
    clientStore.saveClients(updated);
    setSelectedClient(newClient);
    setActiveTab('generate');
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    clientStore.saveApiKey(key);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col font-sans">
      {/* Apple Frosted ヘッダー */}
      <Header
        clients={clients}
        selectedClient={selectedClient}
        onSelectClient={handleSelectClient}
        onOpenNewClientModal={() => setIsClientModalOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasApiKey={!!apiKey}
      />

      {/* サブナビ・タブバー */}
      <div className="border-b border-[#e5e5ea] bg-white/70 backdrop-blur-md sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'generate'
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>記事生成</span>
            </button>

            {activeDraft && (
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeTab === 'editor'
                    ? 'bg-[#1d1d1f] text-white'
                    : 'text-[#0066cc] hover:bg-[#f5f5f7]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>下書きエディタ</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'knowledge'
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>頭脳ナレッジ ({knowledges.filter((k) => k.clientId === selectedClient.id).length})</span>
            </button>

            <button
              onClick={() => setActiveTab('prompts')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'prompts'
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>プロンプト設定</span>
            </button>

            <button
              onClick={() => setActiveTab('drafts')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'drafts'
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>下書き一覧 ({drafts.filter((d) => d.clientId === selectedClient.id).length})</span>
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs text-[#86868b]">
            <span>店舗: <strong className="text-[#1d1d1f]">{selectedClient.name}</strong></span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
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
              className="mb-4 text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center space-x-1 transition"
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
