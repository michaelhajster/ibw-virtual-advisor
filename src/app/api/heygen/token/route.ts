import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Get the base64 developer key from env
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      console.error('Missing HEYGEN_API_KEY in environment variables');
      return NextResponse.json(
        { error: 'Missing HEYGEN_API_KEY in environment variables' },
        { status: 500 }
      );
    }

    // 2. Call HeyGen streaming.create_token with x-api-key
    console.log('🔑 Calling HeyGen create_token...');
    const heygenRes = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({})
    });

    if (!heygenRes.ok) {
      const errBody = await heygenRes.text();
      console.error(`HeyGen create_token failed: ${heygenRes.status} => ${errBody}`);
      return NextResponse.json(
        { error: `HeyGen create_token failed: ${heygenRes.status} => ${errBody}` },
        { status: heygenRes.status }
      );
    }

    const { data } = await heygenRes.json();
    console.log('✨ HeyGen response:', data);

    // Validate the token format
    if (!data?.token || !data.token.startsWith('hey_sk_')) {
      console.error('Invalid token format from HeyGen:', data);
      return NextResponse.json(
        { error: `HeyGen did not return a valid streaming token. Response: ${JSON.stringify(data)}` },
        { status: 500 }
      );
    }

    // 3. Return the streaming token to the client
    console.log('🎉 Got valid streaming token:', data.token.slice(0, 10) + '...');
    return NextResponse.json({ token: data.token });

  } catch (err: any) {
    console.error('Error in HeyGen token route:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 