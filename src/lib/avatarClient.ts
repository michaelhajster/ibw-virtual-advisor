import StreamingAvatar from '@heygen/streaming-avatar';
import { TaskType, StreamingEvents, AvatarQuality, TaskMode } from '@heygen/streaming-avatar';

let avatar: StreamingAvatar | null = null;
let currentSentence = '';
let speakingPromise: Promise<void> | null = null;
let processingStartTime: number | null = null;
let sentenceCount = 0;

/**
 * Initialize a new avatar session using the official HeyGen Streaming Avatar SDK.
 * 
 * - We'll set '73c84e2b886940099c5793b085150f2f' as a known valid public avatar
 * - We'll use "low" quality to avoid 400 errors if the plan doesn't allow higher quality
 */
export async function startAvatarSession(token: string): Promise<void> {
  try {
    console.log('[AvatarSDK] Starting session with token:', token.slice(0, 20) + '...');
    
    // Add error event listener before initialization
    const handleError = (event: any) => {
      console.error('[AvatarSDK] Error event:', event);
    };
    window.addEventListener('error', handleError);
    
    avatar = new StreamingAvatar({ 
      token,
      onError: (error: any) => {
        console.error('[AvatarSDK] SDK Error:', error);
      }
    });

    // Basic event logs
    avatar.on(StreamingEvents.STREAM_READY, (evt: CustomEvent) => {
      console.log('[AvatarSDK] STREAM_READY event - we have a media stream:', evt.detail);
    });
    
    avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.warn('[AvatarSDK] Stream disconnected');
    });

    avatar.on(StreamingEvents.ERROR, (evt: CustomEvent) => {
      console.error('[AvatarSDK] Stream error event:', evt.detail);
    });

    // Start the avatar session
    console.log('[AvatarSDK] Creating avatar with config:', {
      avatarName: '73c84e2b886940099c5793b085150f2f',
      quality: AvatarQuality.Low
    });
    
    const sessionInfo = await avatar.createStartAvatar({
      avatarName: '73c84e2b886940099c5793b085150f2f',
      quality: AvatarQuality.Low,
    }).catch(err => {
      console.error('[AvatarSDK] Create avatar error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack,
        response: err.response
      });
      throw err;
    });

    console.log('[AvatarSDK] Session started. Info:', sessionInfo);
    
    // Cleanup
    window.removeEventListener('error', handleError);
  } catch (err) {
    console.error('[AvatarSDK] Failed to start session:', err);
    throw err;
  }
}

/**
 * Let the calling code attach the media stream to a <video>.
 * We'll re-emit the STREAM_READY event for the callback.
 */
export function onStream(callback: (stream: MediaStream) => void) {
  if (!avatar) {
    console.log('[AvatarSDK] onStream called but no avatar exists');
    return;
  }

  console.log('[AvatarSDK] Setting up stream listener...');
  avatar.on(StreamingEvents.STREAM_READY, (evt: CustomEvent) => {
    console.log('[AvatarSDK] Got STREAM_READY event:', evt);
    const mediaStream = evt.detail as MediaStream;
    console.log('[AvatarSDK] MediaStream details:', {
      active: mediaStream.active,
      id: mediaStream.id,
      tracks: mediaStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      }))
    });
    callback(mediaStream);
  });
}

/**
 * Process a chunk of streamed text and make the avatar speak complete sentences.
 */
export async function processStreamedText(chunk: string) {
  if (!avatar) {
    console.warn('[AvatarSDK] processStreamedText called but no avatar session exists');
    return;
  }

  // Debug: Log chunk details
  console.log(`🔍 [Debug] Received chunk:`, {
    size: chunk.length,
    content: chunk.slice(0, 50) + (chunk.length > 50 ? '...' : ''),
    timestamp: new Date().toISOString()
  });

  // Initialize timer on first chunk
  if (!processingStartTime) {
    processingStartTime = Date.now();
    console.log('\n🎭 ===== AVATAR TIMING LOG =====');
    console.log('⏱️ [0ms] Starting to process first chunk');
  }

  currentSentence += chunk;
  
  // Look for sentence boundaries (. ! ?)
  const sentenceEndRegex = /[.!?]\s+/g;
  let match;
  let lastIndex = 0;

  // Process each complete sentence immediately
  while ((match = sentenceEndRegex.exec(currentSentence)) !== null) {
    const sentence = currentSentence.slice(lastIndex, match.index + 1).trim();
    lastIndex = match.index + match[0].length;
    sentenceCount++;

    // Debug: Log sentence processing
    console.log(`📝 [Debug] Processing sentence #${sentenceCount}:`, {
      sentence,
      length: sentence.length,
      timeFromStart: Date.now() - processingStartTime
    });

    // Process this sentence immediately
    const processSentence = async () => {
      try {
        const speakStart = Date.now();
        console.log(`🎯 [${speakStart - processingStartTime}ms] Calling HeyGen speak API for sentence #${sentenceCount}`);
        
        await avatar.speak({
          text: sentence,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.ASYNC,
        });

        const speakEnd = Date.now();
        console.log(`⏱️ [${speakEnd - processingStartTime}ms] HeyGen API call completed:`, {
          sentence: sentence.slice(0, 30) + (sentence.length > 30 ? '...' : ''),
          duration: speakEnd - speakStart,
          sentenceNum: sentenceCount
        });
      } catch (err) {
        console.error(`❌ [AvatarSDK] Error processing sentence #${sentenceCount}:`, err);
      }
    };

    // Don't wait for the previous sentence to finish before starting to process the next one
    if (!speakingPromise) {
      speakingPromise = processSentence();
    } else {
      speakingPromise = speakingPromise.then(processSentence);
    }
  }

  // Keep any remaining incomplete sentence
  currentSentence = currentSentence.slice(lastIndex);
  
  // Debug: Log remaining buffer
  if (currentSentence) {
    console.log(`💭 [Debug] Remaining buffer:`, {
      content: currentSentence.slice(0, 50) + (currentSentence.length > 50 ? '...' : ''),
      length: currentSentence.length
    });
  }
}

/**
 * Make the avatar speak the GPT text. We use 'repeat' so the avatar won't do its own GPT.
 */
export async function speakText(text: string) {
  if (!avatar) {
    console.warn('[AvatarSDK] speakText called but no avatar session exists');
    return;
  }
  console.log('[AvatarSDK] speak with text:', text);

  // Wait for any previous speaking to finish
  if (speakingPromise) {
    await speakingPromise;
  }

  // 'repeat' => reads your text verbatim
  speakingPromise = avatar.speak({
    text,
    taskType: TaskType.REPEAT,
    taskMode: TaskMode.ASYNC,
  });

  await speakingPromise;
}

/**
 * Stop the avatar session if you want to clean up.
 */
export async function stopAvatarSession() {
  if (!avatar) return;
  console.log('[AvatarSDK] Stopping avatar session...');
  
  // Wait for any speaking to finish
  if (speakingPromise) {
    await speakingPromise;
  }
  
  if (processingStartTime) {
    console.log(`⏱️ [${Date.now() - processingStartTime}ms] Session ended (${sentenceCount} sentences spoken)`);
    console.log('🎭 ================================\n');
  }
  
  await avatar.stopAvatar();
  avatar = null;
  currentSentence = '';
  speakingPromise = null;
  processingStartTime = null;
  sentenceCount = 0;
}
