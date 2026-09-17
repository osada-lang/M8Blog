import { NextRequest, NextResponse } from 'next/server';
import { runFactCheck } from '@/lib/factcheck';
import { KnowledgeItem, PromptType } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      content,
      knowledges,
      promptType,
      apiKey,
    }: {
      content: string;
      knowledges: KnowledgeItem[];
      promptType: PromptType;
      apiKey?: string;
    } = body;

    if (!content) {
      return NextResponse.json({ error: '検証対象のテキストが空です' }, { status: 400 });
    }

    const factCheck = await runFactCheck(content, knowledges || [], promptType || 'general', apiKey);

    return NextResponse.json({ success: true, data: factCheck });
  } catch (error: any) {
    console.error('FactCheck API error:', error);
    return NextResponse.json({ error: error.message || 'ファクトチェックに失敗しました' }, { status: 500 });
  }
}
