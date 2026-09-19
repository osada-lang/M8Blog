'use client';

import React, { useState, useEffect } from 'react';
import { Client, KeywordSheetRow, KnowledgeItem, PromptTemplate } from '@/types';
import { clientStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { SimpleGenerator } from '@/components/SimpleGenerator';
import { ClientModal } from '@/components/ClientModal';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sheetRows, setSheetRows] = useState<KeywordSheetRow[]>([]);
  const [knowledges, setKnowledges] = useState<KnowledgeItem[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [apiKey, setApiKey] = useState('');

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

  const handleAddClient = (newClient: Client) => {
    const updated = [...clients, newClient];
    setClients(updated);
    clientStore.saveClients(updated);
    setSelectedClient(newClient);
    setSheetRows([]);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col font-sans">
      {/* Apple Frosted ヘッダー（ロゴのみのミニマル仕様） */}
      <Header />

      {/* メインコンテンツ（完全1画面） */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <SimpleGenerator
          clients={clients}
          selectedClient={selectedClient}
          onSelectClient={handleSelectClient}
          onOpenNewClientModal={() => setIsClientModalOpen(true)}
          sheetRows={sheetRows}
          knowledges={knowledges}
          prompts={prompts}
          apiKey={apiKey}
          onUpdateSheetRows={handleUpdateSheetRows}
        />
      </main>

      {/* 新規クライアント登録モーダル */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onAddClient={handleAddClient}
      />
    </div>
  );
}
