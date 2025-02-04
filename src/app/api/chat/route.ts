import { NextRequest, NextResponse } from 'next/server';
import { ragChat } from '@/lib/ragChat';
import env from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }

    const { transcript, streaming = false } = await req.json();
    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    if (streaming) {
      return ragChat.getStreamingResponse(transcript);
    }

    console.log('🤖 [Chat] Getting RAG response for:', transcript);
    const response = await ragChat.getChatResponse(transcript);
    console.log('✨ [Chat] RAG response:', response);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('❌ [Chat] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 