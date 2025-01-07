import { NextResponse } from 'next/server';
import { writeFileSync, createReadStream, unlinkSync } from 'fs';
import FormData from 'form-data';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Disable default body parser since we're handling raw audio data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw request body
async function readRequestBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const reader = req.body?.getReader();
  if (!reader) throw new Error('No request body');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Create tmp directory if it doesn't exist
    const tmpDir = path.join(process.cwd(), 'tmp');
    try {
      writeFileSync(path.join(tmpDir, '.gitkeep'), '');
    } catch (err) {
      // Directory probably exists, continue
    }

    // Read the raw audio data
    const audioData = await readRequestBody(req);
    
    // Generate unique filename
    const chunkId = uuidv4();
    const audioPath = path.join(tmpDir, `${chunkId}.webm`);

    // Save audio chunk
    writeFileSync(audioPath, audioData);

    // Prepare form data for OpenAI
    const formData = new FormData();
    formData.append('file', createReadStream(audioPath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Optional: specify language

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    // Clean up temp file
    try {
      unlinkSync(audioPath);
    } catch (err) {
      console.error('Error cleaning up temp file:', err);
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ transcript: result.text });

  } catch (err) {
    console.error('Transcription error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 