import { NextRequest, NextResponse } from 'next/server';
import { generateArticleWithClaude } from '@/lib/claude';
import { runFactCheck } from '@/lib/factcheck';
import { Client, GenerateArticleRequest, KnowledgeItem, PromptTemplate } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      client,
      knowledges,
      promptTemplate,
      generateRequest,
    }: {
      client: Client;
      knowledges: KnowledgeItem[];
      promptTemplate: PromptTemplate;
      generateRequest: GenerateArticleRequest;
    } = body;

    if (!client || !generateRequest?.sheetRow?.mainKeyword) {
      return NextResponse.json({ error: 'クライアント情報とキーワード設計情報は必須です' }, { status: 400 });
    }

    // 1. Claude 3.5 Sonnet による下書き生成（文献要約RAG × スプシ各列の完全マッピング）
    const output = await generateArticleWithClaude(
      client,
      knowledges || [],
      promptTemplate,
      generateRequest
    );

    // 2. 自動ファクトチェック（ハルシネーション・薬機法検知）
    const factCheck = await runFactCheck(
      output.contentMarkdown,
      knowledges || [],
      generateRequest.promptType,
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
