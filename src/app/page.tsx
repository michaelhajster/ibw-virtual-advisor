'use client';

import { useRef, useState, useEffect } from 'react';
import AudioCapture from '@/components/AudioCapture';
import { initAvatarSession, speakWithAvatar } from '@/lib/heygenClient';
import type StreamingAvatar from '@heygen/streaming-avatar';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const [isAvatarReady, setAvatarReady] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper function to wait for avatar to be ready
  async function waitForAvatar(timeoutMs = 15000): Promise<StreamingAvatar> {
    const startTime = Date.now();
    console.log('🔄 [Page] Checking avatar readiness...');
    
    while (Date.now() - startTime < timeoutMs) {
      if (avatarRef.current && isAvatarReady) {
        console.log('✅ [Page] Avatar is ready');
        return avatarRef.current;
      }
      console.log('⏳ [Page] Avatar not ready, waiting... Current state:', {
        hasAvatar: !!avatarRef.current,
        isReady: isAvatarReady
      });
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait longer between checks
    }
    throw new Error('Avatar initialization timed out. Please refresh the page and try again.');
  }

  // Initialize avatar with token when the page loads
  useEffect(() => {
    async function getTokenAndInit() {
      try {
        setError(''); // Clear any previous errors
        console.log('🔑 [Page] Fetching HeyGen token...');
        const res = await fetch('/api/heygen/token', { method: 'POST' });
        const json = await res.json();

        if (!json.token) {
          throw new Error('No token received from server');
        }
        console.log('🎭 [Page] Initializing avatar with token...');

        // Start the avatar session
        const avatar = await initAvatarSession({
          token: json.token,
          onStreamReady: (stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(console.error);
              setAvatarReady(true);
              console.log('✨ [Page] Avatar stream ready');
            }
          },
        });
        avatarRef.current = avatar;
        console.log('🚀 [Page] Avatar initialized successfully');
      } catch (err) {
        console.error('💥 [Page] Avatar initialization error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to initialize avatar'
        );
        // Reset states on error
        setAvatarReady(false);
        avatarRef.current = null;
      }
    }
    getTokenAndInit();

    // Cleanup function
    return () => {
      if (avatarRef.current) {
        console.log('🧹 [Page] Cleaning up avatar...');
        setAvatarReady(false);
        avatarRef.current = null;
      }
    };
  }, []);

  /**
   * Called whenever we have a final audio blob from the user's recording.
   * We will transcribe, then call GPT, then speak GPT's result automatically.
   */
  async function handleAudioChunk(blob: Blob) {
    if (isProcessing) {
      console.log('🚫 [Page] Already processing, skipping new audio chunk');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('🎤 [Page] Got audio chunk:', {
        size: blob.size,
        type: blob.type,
      });

      // 1) Send audio to /api/transcribe
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: blob,
      });
      if (!response.ok) {
        throw new Error(`Transcription failed: ${await response.text()}`);
      }
      const { transcript } = await response.json();
      console.log('📝 [Page] Got transcript:', transcript);
      setTranscript(transcript);

      // 2) Wait for avatar to be ready (with timeout)
      console.log('🔄 [Page] Waiting for avatar to be ready...');
      const avatar = await waitForAvatar();
      
      // 3) Get GPT's answer
      console.log('🤖 [Page] Getting GPT response...');
      const gptResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      });

      if (!gptResponse.ok) {
        throw new Error(`GPT request failed: ${await gptResponse.text()}`);
      }

      const { response: gptAnswer } = await gptResponse.json();
      console.log('✨ [Page] GPT answer:', gptAnswer);

      // 4) Make avatar speak GPT's answer
      console.log('🗣️ [Page] Making avatar speak...');
      await speakWithAvatar(avatar, gptAnswer);
      console.log('✅ [Page] Avatar spoke GPT answer');

    } catch (err) {
      console.error('❌ [Page] Error in handleAudioChunk:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-2xl space-y-4">
        {/* Avatar Video Feed */}
        <div className="relative aspect-video bg-gray-900 rounded">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!isAvatarReady && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                <p>Loading avatar...</p>
              </div>
            </div>
          )}
        </div>

        {/* Audio Capture + Errors */}
        <AudioCapture onAudioChunk={handleAudioChunk} />
        {error && <div className="text-red-500 text-sm">{error}</div>}

        {/* Processing State */}
        {isProcessing && (
          <div className="text-blue-500 text-sm animate-pulse">
            Processing your request...
          </div>
        )}

        {/* Show final transcript */}
        {transcript && (
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Last Transcript:</h3>
            <p>{transcript}</p>
          </div>
        )}
      </div>
    </main>
  );
}
