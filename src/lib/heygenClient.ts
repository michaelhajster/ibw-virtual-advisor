import StreamingAvatar, { 
  AvatarQuality, 
  StreamingEvents, 
  TaskType
} from '@heygen/streaming-avatar';

interface InitAvatarOptions {
  token: string;  // must pass a "hey_sk_..." token from the client
  avatarId?: string;
  onStreamReady?: (stream: MediaStream) => void;
}

export async function initAvatarSession(options: InitAvatarOptions) {
  const { 
    token, 
    avatarId = '73c84e2b886940099c5793b085150f2f',
    onStreamReady 
  } = options;

  console.log('🎭 [HeyGen] Initializing avatar session with token:', token.slice(0, 10) + '...');
  
  try {
    // Initialize with just the token
    const avatar = new StreamingAvatar({ token });

    // Add event listeners
    avatar.on(StreamingEvents.STREAM_READY, (evt: CustomEvent) => {
      console.log('✨ [HeyGen] Stream ready, event details:', evt.detail);
      const stream = evt.detail as MediaStream;
      onStreamReady?.(stream);
    });

    avatar.on('error', (error: any) => {
      console.error('❌ [HeyGen] Avatar error:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
        raw: error
      });
      throw error;
    });

    // Initialize the avatar with minimal config
    console.log('🚀 [HeyGen] Starting avatar...');
    await avatar.createStartAvatar({
      avatarName: avatarId,
      quality: AvatarQuality.Medium,
    });
    
    console.log('✅ [HeyGen] Avatar initialized successfully');
    return avatar;

  } catch (error: any) {
    // Log the full error object for debugging
    console.error('💥 [HeyGen] Failed to initialize avatar:', error);
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

export async function speakWithAvatar(avatar: StreamingAvatar, text: string) {
  try {
    console.log('🗣️ [HeyGen] Speaking:', text);
    await avatar.speak({
      text,
      taskType: TaskType.REPEAT,
    });
    console.log('✅ [HeyGen] Speech completed');
  } catch (error: any) {
    console.error('❌ [HeyGen] Speech error:', error);
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