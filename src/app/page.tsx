'use client';

import React, { useState, useEffect } from 'react';
import { BlogDraft, Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { clientStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { KnowledgeManager } from '@/components/KnowledgeManager';
import { SheetKeywordManager } from '@/components/SheetKeywordManager';
import { DraftEditor } from '@/components/DraftEditor';
import { DraftList } from '@/components/DraftList';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { ClientModal } from '@/components/ClientModal';
import { Table, BrainCircuit, FileText, ArrowLeft, Loader2 } from 'lucide-react';

type MainTab = 'sheet' | 'knowledge' | 'drafts' | 'editor';

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sheetRows, setSheetRows] = useState<KeywordSheetRow[]>([]);
  const [knowledges, setKnowledges] = useState<KnowledgeItem[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<BlogDraft | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('sheet');
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
      const first = loadedClients[0];
      setSelectedClient(first);
      setSheetRows(clientStore.getSheetRows(first.id));
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
    setSheetRows(clientStore.getSheetRows(client.id));
    if (activeTab === 'editor') {
      setActiveTab('sheet');
      setActiveDraft(null);
    }
  };

  const handleUpdateSheetRows = (rows: KeywordSheetRow[]) => {
    setSheetRows(rows);
    clientStore.saveSheetRows(selectedClient.id, rows);
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
    setSheetRows([]);
    setActiveTab('sheet');
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    clientStore.saveApiKey(key);
  };

  const handleOpenDraftById = (draftId: string) => {
    const found = drafts.find((d) => d.id === draftId);
    if (found) {
      setActiveDraft(found);
      setActiveTab('editor');
    }
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

      {/* ミニマルな3大ナビゲーションバー */}
      <div className="border-b border-[#e5e5ea] bg-white/70 backdrop-blur-md sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'sheet'
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>キーワード設計表 ({sheetRows.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'knowledge'
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>文献要約集・頭脳 ({knowledges.filter((k) => k.clientId === selectedClient.id).length})</span>
            </button>

            {activeDraft ? (
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeTab === 'editor'
                    ? 'bg-[#1d1d1f] text-white'
                    : 'text-[#0066cc] hover:bg-[#f5f5f7]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>下書きエディタ</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('drafts')}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeTab === 'drafts'
                    ? 'bg-[#1d1d1f] text-white'
                    : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>生成済み下書き ({drafts.filter((d) => d.clientId === selectedClient.id).length})</span>
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs text-[#86868b]">
            <span>対象: <strong className="text-[#1d1d1f]">{selectedClient.name}</strong></span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'sheet' && (
          <SheetKeywordManager
            client={selectedClient}
            sheetRows={sheetRows}
            knowledges={knowledges}
            prompts={prompts}
            apiKey={apiKey}
            onUpdateSheetRows={handleUpdateSheetRows}
            onGenerateSuccess={handleGenerateSuccess}
            onOpenDraft={handleOpenDraftById}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeManager
            client={selectedClient}
            knowledges={knowledges}
            onAddKnowledge={handleAddKnowledge}
            onDeleteKnowledge={handleDeleteKnowledge}
          />
        )}

        {activeTab === 'editor' && activeDraft && (
          <div>
            <button
              onClick={() => setActiveTab('sheet')}
              className="mb-4 text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center space-x-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>キーワード設計表に戻る</span>
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

        {activeTab === 'drafts' && (
          <DraftList
            client={selectedClient}
            drafts={drafts}
            onSelectDraft={(draft) => {
              setActiveDraft(draft);
              setActiveTab('editor');
            }}
            onDeleteDraft={handleDeleteDraft}
            onCreateNew={() => setActiveTab('sheet')}
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
