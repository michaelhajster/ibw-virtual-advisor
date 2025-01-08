import StreamingAvatar from '@heygen/streaming-avatar';
import { TaskType, StreamingEvents, AvatarQuality } from '@heygen/streaming-avatar';

let avatar: StreamingAvatar | null = null;

/**
 * Initialize a new avatar session using the official HeyGen Streaming Avatar SDK.
 * 
 * - We'll set '73c84e2b886940099c5793b085150f2f' as a known valid public avatar
 * - We'll use "low" quality to avoid 400 errors if the plan doesn't allow higher quality
 */
export async function startAvatarSession(token: string): Promise<void> {
  try {
    avatar = new StreamingAvatar({ token });

    // Basic event logs
    avatar.on(StreamingEvents.STREAM_READY, (evt: CustomEvent) => {
      console.log('[AvatarSDK] STREAM_READY event - we have a media stream:', evt.detail);
    });
    avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.warn('[AvatarSDK] stream disconnected');
    });

    // Start the avatar session
    const sessionInfo = await avatar.createStartAvatar({
      avatarName: '73c84e2b886940099c5793b085150f2f', // Angelina Outdoor avatar ID
      quality: AvatarQuality.Low,                      // "low" to avoid plan restrictions
      // voice, knowledgeId, etc. can be added if needed
    });

    console.log('[AvatarSDK] Session started. Info:', sessionInfo);
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
  if (!avatar) return;

  avatar.on(StreamingEvents.STREAM_READY, (evt: CustomEvent) => {
    const mediaStream = evt.detail as MediaStream;
    callback(mediaStream);
  });
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

  // 'repeat' => reads your text verbatim
  await avatar.speak({
    text,
    taskType: TaskType.REPEAT,
  });
}

/**
 * Stop the avatar session if you want to clean up.
 */
export async function stopAvatarSession() {
  if (!avatar) return;
  console.log('[AvatarSDK] Stopping avatar session...');
  await avatar.stopAvatar();
  avatar = null;
}
