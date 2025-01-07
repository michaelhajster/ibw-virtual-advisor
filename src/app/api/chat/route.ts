import { NextRequest, NextResponse } from 'next/server';
import { getAssistantResponse } from '@/lib/openaiAssistant';
import env from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }

    const { transcript } = await req.json();
    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    console.log('🤖 [Chat] Getting GPT response for:', transcript);
    const response = await getAssistantResponse(transcript);
    console.log('✨ [Chat] GPT response:', response);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('❌ [Chat] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 