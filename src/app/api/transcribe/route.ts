import { NextRequest, NextResponse } from 'next/server';
import env from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    // Validate API key
    if (!env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found. Please check your environment variables.');
    }

    // Get the audio blob directly
    const audioBlob = await req.blob();
    console.log('📊 [Transcribe] Audio blob:', {
      size: audioBlob.size,
      type: audioBlob.type
    });

    // Create form data
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'de');
    formData.append('response_format', 'json');

    // Call Whisper API
    console.log('🚀 [Transcribe] Calling Whisper API with German language...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ [Transcribe] Whisper API error:', error);
      throw new Error(`Whisper API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('✨ [Transcribe] Success! Transcript:', result.text);

    return NextResponse.json({ transcript: result.text });

  } catch (err) {
    console.error('💥 [Transcribe] Error:', err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
} 