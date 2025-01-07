import StreamingAvatar, { 
  AvatarQuality, 
  StreamingEvents, 
  TaskType
} from '@heygen/streaming-avatar';

let avatar: StreamingAvatar | null = null;

interface InitAvatarOptions {
  token?: string;
  avatarId?: string;
  onStreamReady?: (stream: MediaStream) => void;
}

function validateHeyGenToken(token: string | undefined): string {
  if (!token) {
    throw new Error(
      'No HeyGen API key found. Please:\n' +
      '1. Go to https://labs.heygen.com/streaming\n' +
      '2. Generate a Streaming Access Token\n' +
      '3. Add it to .env.local as NEXT_PUBLIC_HEYGEN_API_KEY\n' +
      'Note: The token should look like "hey_sk_..." not a Base64 string.'
    );
  }

  // Basic validation that it's a streaming token
  if (token.startsWith('NDNk')) {
    throw new Error(
      'Invalid HeyGen token format. You provided a Base64 token, but streaming requires a different format.\n' +
      'Please get a Streaming Access Token from https://labs.heygen.com/streaming\n' +
      'It should start with "hey_sk_..."'
    );
  }

  return token;
}

export async function initAvatarSession(options: InitAvatarOptions = {}) {
  const {
    // For streaming avatar, we need the client-side token
    token = typeof window !== 'undefined' 
      ? process.env.NEXT_PUBLIC_HEYGEN_API_KEY 
      : undefined,
    avatarId = '73c84e2b886940099c5793b085150f2f',
    onStreamReady
  } = options;

  try {
    const validToken = validateHeyGenToken(token);
    
    avatar = new StreamingAvatar({ token: validToken });

    avatar.on(StreamingEvents.STREAM_READY, (evt: CustomEvent) => {
      console.log('HeyGen stream is ready');
      if (onStreamReady && evt.detail?.stream) {
        onStreamReady(evt.detail.stream);
      }
    });

    avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log('HeyGen stream disconnected');
    });

    await avatar.createStartAvatar({
      avatarName: avatarId,
      quality: AvatarQuality.Medium,
      language: 'English',
    });

    console.log('Avatar session started successfully');
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to initialize HeyGen avatar');
    console.error(error.message);
    throw error;
  }
}

export async function speakWithAvatar(text: string) {
  if (!avatar) {
    throw new Error(
      'Avatar session not initialized. Please ensure:\n' +
      '1. You have called initAvatarSession\n' +
      '2. You have a valid streaming token\n' +
      '3. The initialization was successful'
    );
  }

  try {
    await avatar.speak({
      text,
      taskType: TaskType.REPEAT,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to make avatar speak');
    console.error(error.message);
    throw error;
  }
} 