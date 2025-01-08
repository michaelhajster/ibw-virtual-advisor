import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      throw new Error('Missing HEYGEN_API_KEY in environment variables');
    }

    console.log(' [Token API] Getting streaming token...');
    const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
    });

    const responseText = await response.text();
    console.log(' [Token API] HeyGen response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status} ${response.statusText}\nResponse: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse token response: ${e}\nResponse: ${responseText}`);
    }

    if (!data?.data?.token) {
      throw new Error(`No token in response. Got: ${JSON.stringify(data)}`);
    }

    // Return the token exactly as received from HeyGen
    console.log(' [Token API] Got token:', data.data.token.slice(0, 10) + '...');
    return NextResponse.json({ token: data.data.token });

  } catch (error: any) {
    console.error(' [Token API] Failed to get token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get token' },
      { status: 500 }
    );
  }
}
