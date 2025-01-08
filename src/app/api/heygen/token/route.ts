import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

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
      body: JSON.stringify({})  // per docs, empty object is fine
    });

    if (!heygenRes.ok) {
      const errBody = await heygenRes.text();
      console.error(`HeyGen create_token failed: ${heygenRes.status} => ${errBody}`);
      return NextResponse.json(
        { error: `HeyGen create_token failed: ${heygenRes.status} => ${errBody}` },
        { status: heygenRes.status }
      );
    }

    // 3. Parse JSON => Typically { code:0, msg:'ok', data:{ token:'<base64>' } }
    const { data } = await heygenRes.json();
    console.log('✨ HeyGen response:', data);

    if (!data?.token) {
      console.error('No "token" found in HeyGen response', data);
      return NextResponse.json(
        { error: 'No "token" field found in HeyGen response' },
        { status: 500 }
      );
    }

    // 4. The token is base64-encoded JSON. Let's decode it and parse
    //    Example decode => { "token":"hey_sk_ABC123", "token_type":"..." }
    const base64 = data.token;
    const decodedString = Buffer.from(base64, 'base64').toString('utf-8');
    let parsed;
    try {
      parsed = JSON.parse(decodedString);
    } catch (err) {
      console.error('Invalid JSON after base64 decoding:', decodedString);
      return NextResponse.json(
        { error: 'Invalid JSON after base64 decoding' },
        { status: 500 }
      );
    }

    // 5. Check that parsed.token starts with "hey_sk_"
    if (!parsed?.token || !parsed.token.startsWith('hey_sk_')) {
      console.error('Decoded token does not start with "hey_sk_":', parsed);
      return NextResponse.json(
        { error: 'Decoded token is not a valid "hey_sk_" token.' },
        { status: 500 }
      );
    }

    // 6. Return the actual "hey_sk_..." token to the client
    console.log('🎉 Got valid streaming token:', parsed.token.slice(0, 10) + '...');
    return NextResponse.json({ token: parsed.token });

  } catch (err: any) {
    console.error('Error in HeyGen token route:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
