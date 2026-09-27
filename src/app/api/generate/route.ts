import { NextRequest, NextResponse } from 'next/server';
import { generateArticleWithClaude } from '@/lib/claude';
import { runFactCheck } from '@/lib/factcheck';
import { DEFAULT_PROMPT_TEMPLATES } from '@/lib/defaultPrompts';
import { Client, GenerateArticleRequest, KnowledgeItem } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      client,
      knowledges,
      generateRequest,
    }: {
      client: Client;
      knowledges: KnowledgeItem[];
      generateRequest: GenerateArticleRequest;
    } = body;

    if (!client || !generateRequest?.sheetRow?.mainKeyword) {
      return NextResponse.json({ error: 'クライアント情報とキーワード設計情報は必須です' }, { status: 400 });
    }

    // サーバー側の最新マスタープロンプトを常に直接適用（キャッシュによる古い指示の残存を完全防止）
    const promptType = generateRequest.promptType || client.promptType || 'general';
    const activePrompt =
      DEFAULT_PROMPT_TEMPLATES.find((p) => p.type === promptType) ||
      DEFAULT_PROMPT_TEMPLATES[0];

    // 1. Claude による下書き生成（文献要約RAG × スプシ各列の完全マッピング）
    const output = await generateArticleWithClaude(
      client,
      knowledges || [],
      activePrompt,
      generateRequest
    );

    // 2. 自動ファクトチェック（ハルシネーション・薬機法検知）
    const factCheck = await runFactCheck(
      output.contentMarkdown,
      knowledges || [],
      promptType,
      generateRequest.apiKey
    );

    return NextResponse.json({
      success: true,
      data: {
        ...output,
        factCheck,
      },
    });
  } catch (error: any) {
    console.error('Generation API error:', error);
    return NextResponse.json({ error: error.message || '記事生成に失敗しました' }, { status: 500 });
  }
}
