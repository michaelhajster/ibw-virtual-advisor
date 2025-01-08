import { Room, RoomEvent } from 'livekit-client';

interface InitAvatarOptions {
  token: string;
  avatarId?: string;
  onStreamReady?: (stream: MediaStream) => void;
}

export async function initAvatarSession(options: InitAvatarOptions) {
  const { 
    token, 
    avatarId = 'Santa_Fireplace_Front_public',  // Using their default avatar
    onStreamReady 
  } = options;

  console.log(' [HeyGen] Initializing avatar session with token:', token.slice(0, 10) + '...');
  
  try {
    // Create new streaming session
    console.log(' [HeyGen] Creating streaming session...');
    const response = await fetch('https://api.heygen.com/v1/streaming.new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        version: 'v2',
        quality: 'high',
        avatar_name: avatarId,
        video_encoding: 'VP8',
        voice: {
          rate: 1,
        },
      }),
    });

    const responseText = await response.text();
    console.log(' [HeyGen] Streaming session response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (!response.ok) {
      throw new Error(`Failed to create streaming session: ${response.status} ${response.statusText}\nResponse: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse streaming session response: ${e}\nResponse: ${responseText}`);
    }

    const sessionInfo = data.data;
    console.log(' [HeyGen] Got session info:', {
      sessionId: sessionInfo?.session_id,
      hasUrl: !!sessionInfo?.url,
      hasToken: !!sessionInfo?.token
    });

    if (!sessionInfo?.url || !sessionInfo?.token) {
      throw new Error(`Missing required session info. Got: ${JSON.stringify(sessionInfo)}`);
    }

    // Create LiveKit Room
    console.log(' [HeyGen] Creating LiveKit room...');
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720 },
      },
    });

    // Handle media streams
    const mediaStream = new MediaStream();
    room.on(RoomEvent.TrackSubscribed, (track) => {
      console.log(' [HeyGen] Track subscribed:', track.kind);
      if (track.kind === 'video' || track.kind === 'audio') {
        mediaStream.addTrack(track.mediaStreamTrack);
        console.log(' [HeyGen] Media tracks:', {
          video: mediaStream.getVideoTracks().length,
          audio: mediaStream.getAudioTracks().length
        });
        if (mediaStream.getVideoTracks().length > 0 && mediaStream.getAudioTracks().length > 0) {
          onStreamReady?.(mediaStream);
          console.log(' [HeyGen] Media stream ready');
        }
      }
    });

    // Connect to LiveKit room
    console.log(' [HeyGen] Connecting to LiveKit room at:', sessionInfo.url);
    await room.connect(sessionInfo.url, sessionInfo.token);
    console.log(' [HeyGen] Connected to LiveKit room');

    // Connect WebSocket for chat
    const wsParams = new URLSearchParams({
      session_id: sessionInfo.session_id,
      session_token: token,
      silence_response: 'false',
      opening_text: '',
      stt_language: 'en',
    });

    const wsUrl = `wss://${new URL('https://api.heygen.com').hostname}/v1/ws/streaming.chat?${wsParams}`;
    console.log(' [HeyGen] Connecting WebSocket to:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      console.log(' [HeyGen] WebSocket connected');
    });

    ws.addEventListener('message', (event) => {
      const eventData = JSON.parse(event.data);
      console.log(' [HeyGen] WebSocket message:', eventData);
    });

    ws.addEventListener('error', (error) => {
      console.error(' [HeyGen] WebSocket error:', error);
    });

    ws.addEventListener('close', (event) => {
      console.log(' [HeyGen] WebSocket closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
    });

    console.log(' [HeyGen] Avatar initialized successfully');
    return { room, ws };

  } catch (error: any) {
    console.error(' [HeyGen] Failed to initialize avatar:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      stack: error.stack
    });
    throw error;
  }
}

export async function speakWithAvatar(ws: WebSocket, text: string) {
  try {
    console.log(' [HeyGen] Speaking:', text);
    ws.send(JSON.stringify({
      text,
      type: 'talk'
    }));
    console.log(' [HeyGen] Speech message sent');
  } catch (error: any) {
    console.error(' [HeyGen] Speech error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      stack: error.stack
    });
    throw error;
  }
}