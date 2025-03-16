import StreamingAvatar from '@heygen/streaming-avatar';
import { TaskType, StreamingEvents, AvatarQuality, TaskMode } from '@heygen/streaming-avatar';

let avatar: StreamingAvatar | null = null;
let textBuffer = '';
let speakingPromise: Promise<void> | null = null;
let processingStartTime: number | null = null;
let chunkCount = 0;
let isProcessing = false;

// Konfiguration für Chunk-Größen
const MAX_CHUNK_SIZE = 150;
const MIN_CHUNK_SIZE = 50;
const MAX_RETRY_ATTEMPTS = 2;

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
      avatarName: 'Wayne_20240711',
      quality: AvatarQuality.Low
    });
    
    const sessionInfo = await avatar.createStartAvatar({
      avatarName: 'Wayne_20240711',
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
    
    // Warm up the HeyGen API with an initial silent call
    // This helps reduce the latency of the first actual speak call
    try {
      console.log('[AvatarSDK] Warming up HeyGen API...');
      const warmupPromise = avatar.speak({
        text: "Warm up",  // This text won't be heard by the user
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.ASYNC,
      });
      
      // Don't await the warmup - let it run in the background
      warmupPromise.catch(err => {
        // Just log any errors, don't interrupt the flow
        console.warn('[AvatarSDK] Warmup request failed (non-critical):', err);
      });
    } catch (err) {
      // Just log the error, don't interrupt the flow
      console.warn('[AvatarSDK] Failed to send warmup request (non-critical):', err);
    }
    
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
 * Optimierte Funktion zum Senden von Text an die HeyGen API mit Retry-Logik
 */
async function sendSpeakRequest(text: string, chunkNum: number): Promise<void> {
  if (!avatar) return;
  
  let retryCount = 0;
  let lastError: any = null;
  
  while (retryCount <= MAX_RETRY_ATTEMPTS) {
    try {
      const speakStart = Date.now();
      console.log(`🎯 [${speakStart - (processingStartTime || 0)}ms] Calling HeyGen speak API for chunk #${chunkNum} (attempt ${retryCount + 1})`);
      
      await avatar.speak({
        text,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.ASYNC,
      });
      
      const speakEnd = Date.now();
      console.log(`⏱️ [${speakEnd - (processingStartTime || 0)}ms] HeyGen API call completed:`, {
        text: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
        duration: speakEnd - speakStart,
        chunkNum
      });
      
      // Erfolg - zurückkehren
      return;
    } catch (err) {
      lastError = err;
      retryCount++;
      
      console.warn(`⚠️ [AvatarSDK] Error on attempt ${retryCount}/${MAX_RETRY_ATTEMPTS + 1} for chunk #${chunkNum}:`, err);
      
      // Wenn wir das Limit erreicht haben, weitergeben
      if (retryCount > MAX_RETRY_ATTEMPTS) break;
      
      // Exponentielles Backoff - mit jedem Versuch länger warten
      const backoffTime = 1000 * Math.pow(2, retryCount - 1);
      console.log(`⏳ [AvatarSDK] Waiting ${backoffTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  
  // Alle Wiederholungsversuche fehlgeschlagen
  console.error(`❌ [AvatarSDK] Failed to process chunk #${chunkNum} after ${MAX_RETRY_ATTEMPTS + 1} attempts:`, lastError);
  // Trotz Fehlern fortfahren
}

/**
 * Process a chunk of streamed text in larger batches to reduce API calls.
 * Prioritizes starting speech quickly for the first chunks.
 */
export async function processStreamedText(chunk: string, isLastChunk = false, isPriority = false) {
  if (!avatar) {
    console.warn('[AvatarSDK] processStreamedText called but no avatar session exists');
    return;
  }

  // Debug: Log chunk details
  console.log(`🔍 [Debug] Received chunk:`, {
    size: chunk.length,
    content: chunk.slice(0, 50) + (chunk.length > 50 ? '...' : ''),
    timestamp: new Date().toISOString(),
    isLastChunk,
    isPriority
  });

  // Initialize timer on first chunk
  if (!processingStartTime) {
    processingStartTime = Date.now();
    console.log('\n🎭 ===== AVATAR TIMING LOG =====');
    console.log('⏱️ [0ms] Starting to process first chunk');
  }

  // Text zum Buffer hinzufügen
  textBuffer += chunk;
  
  // Prozessieren starten, wenn wir genug Text haben oder dies ein Prioritäts-Chunk ist
  const shouldProcess = isPriority || 
                       textBuffer.length >= MIN_CHUNK_SIZE || 
                       (isLastChunk && textBuffer.length > 0);
  
  if (shouldProcess && !isProcessing) {
    // Prozessiere Text in optimierten Chunks
    await processTextBuffer(isLastChunk);
  } else if (isLastChunk && textBuffer.length > 0) {
    // Sicherstellen, dass der letzte Chunk immer verarbeitet wird
    await processTextBuffer(true);
  }
}

/**
 * Hilfsfunktion zum Verarbeiten des Text-Buffers in optimierten Chunks
 */
async function processTextBuffer(isLastChunk: boolean): Promise<void> {
  if (isProcessing || !textBuffer) return;
  
  try {
    isProcessing = true;
    
    // Verarbeite im Buffer vorhandenen Text in Chunks von MAX_CHUNK_SIZE
    while (textBuffer.length > 0) {
      const chunkSize = Math.min(textBuffer.length, MAX_CHUNK_SIZE);
      const textToProcess = textBuffer.slice(0, chunkSize);
      
      // Buffer aktualisieren
      textBuffer = textBuffer.slice(chunkSize);
      chunkCount++;
      
      // Debuginformationen
      console.log(`📝 [Debug] Processing chunk #${chunkCount}:`, {
        size: textToProcess.length,
        content: textToProcess.slice(0, 30) + (textToProcess.length > 30 ? '...' : ''),
        remainingBuffer: textBuffer.length,
        isLastPiece: isLastChunk && textBuffer.length === 0
      });
      
      // Text an die Speak-Funktion senden
      const processChunk = async () => {
        await sendSpeakRequest(textToProcess, chunkCount);
      };
      
      // Chunks sequentiell verarbeiten, aber ohne zu viel Overhead
      if (!speakingPromise) {
        speakingPromise = processChunk();
      } else {
        speakingPromise = speakingPromise.then(processChunk);
      }
      
      // Wenn noch mehr als genug Text übrig ist, sofort weitermachen
      // ohne auf die Verarbeitung zu warten
      if (textBuffer.length >= MAX_CHUNK_SIZE) {
        continue;
      }
      
      // Wenn wir am Ende sind und nicht genügend Text für einen vollen Chunk haben,
      // warten wir auf das nächste Textstück, es sei denn, dies ist der letzte Chunk
      if (textBuffer.length < MIN_CHUNK_SIZE && !isLastChunk) {
        break;
      }
    }
  } finally {
    // Wenn dies der letzte Chunk war und wir diesen verarbeitet haben,
    // setzen wir isProcessing zurück
    if (isLastChunk && textBuffer.length === 0) {
      isProcessing = false;
    } else {
      // Ansonsten setzen wir isProcessing nur zurück, wenn Buffer leer ist
      isProcessing = textBuffer.length > 0;
    }
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
  speakingPromise = sendSpeakRequest(text, ++chunkCount);
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
    console.log(`⏱️ [${Date.now() - processingStartTime}ms] Session ended (${chunkCount} chunks spoken)`);
    console.log('🎭 ================================\n');
  }
  
  await avatar.stopAvatar();
  avatar = null;
  textBuffer = '';
  speakingPromise = null;
  processingStartTime = null;
  chunkCount = 0;
  isProcessing = false;
}
