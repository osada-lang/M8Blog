'use client';

import React, { useState, useEffect } from 'react';
import { Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { clientStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { KnowledgeManager } from '@/components/KnowledgeManager';
import { SimpleGenerator } from '@/components/SimpleGenerator';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { ClientModal } from '@/components/ClientModal';
import { Sparkles, BrainCircuit, Loader2 } from 'lucide-react';

type MainTab = 'generate' | 'knowledge';

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sheetRows, setSheetRows] = useState<KeywordSheetRow[]>([]);
  const [knowledges, setKnowledges] = useState<KnowledgeItem[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>('generate');
  const [apiKey, setApiKey] = useState('');

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadedClients = clientStore.getClients();
    const loadedKnowledges = clientStore.getKnowledges();
    const loadedPrompts = clientStore.getPrompts();
    const loadedApiKey = clientStore.getApiKey();

    setClients(loadedClients);
    if (loadedClients.length > 0) {
      const first = loadedClients[0];
      setSelectedClient(first);
      setSheetRows(clientStore.getSheetRows(first.id));
    }
    setKnowledges(loadedKnowledges);
    setPrompts(loadedPrompts);
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

  const handleAddClient = (newClient: Client) => {
    const updated = [...clients, newClient];
    setClients(updated);
    clientStore.saveClients(updated);
    setSelectedClient(newClient);
    setSheetRows([]);
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

      {/* 超シンプルな2画面タブバー */}
      <div className="border-b border-[#e5e5ea] bg-white/70 backdrop-blur-md sticky top-14 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'generate'
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>記事生成（孫記事）</span>
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
              <span>文献要約集 ({knowledges.filter((k) => k.clientId === selectedClient.id).length})</span>
            </button>
          </div>

          <div className="text-xs text-[#86868b]">
            <span>店舗: <strong className="text-[#1d1d1f]">{selectedClient.name}</strong></span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'generate' && (
          <SimpleGenerator
            client={selectedClient}
            sheetRows={sheetRows}
            knowledges={knowledges}
            prompts={prompts}
            apiKey={apiKey}
            onUpdateSheetRows={handleUpdateSheetRows}
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
