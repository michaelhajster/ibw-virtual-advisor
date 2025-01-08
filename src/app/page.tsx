'use client';

import { useRef, useState, useEffect } from 'react';
import AudioCapture from '@/components/AudioCapture';
import { initAvatarSession, speakWithAvatar } from '@/lib/heygenClient';
import type { Room } from 'livekit-client';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isAvatarReady, setAvatarReady] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Helper function to wait for avatar to be ready
  async function waitForAvatar(timeoutMs = 15000): Promise<{ room: Room, ws: WebSocket }> {
    const startTime = Date.now();
    console.log('🔄 [Page] Checking avatar readiness...');
    
    while (Date.now() - startTime < timeoutMs) {
      if (roomRef.current && wsRef.current && isAvatarReady) {
        console.log('✅ [Page] Avatar is ready');
        return { room: roomRef.current, ws: wsRef.current };
      }
      console.log('⏳ [Page] Avatar not ready, waiting... Current state:', {
        hasRoom: !!roomRef.current,
        hasWs: !!wsRef.current,
        isReady: isAvatarReady
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Avatar initialization timed out. Please refresh the page and try again.');
  }

  // Cleanup function to properly close connections
  const cleanup = () => {
    if (roomRef.current) {
      console.log('🧹 [Page] Cleaning up room...');
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (wsRef.current) {
      console.log('🧹 [Page] Cleaning up WebSocket...');
      wsRef.current.close();
      wsRef.current = null;
    }
    setAvatarReady(false);
  };

  // Initialize avatar with token
  async function initializeAvatar() {
    // Prevent multiple initialization attempts
    if (isInitializing) {
      console.log('⚠️ [Page] Already initializing avatar, skipping...');
      return;
    }

    try {
      setIsInitializing(true);
      setError(''); // Clear any previous errors
      cleanup(); // Clean up any existing connections

      console.log('🔑 [Page] Fetching HeyGen token...');
      const res = await fetch('/api/heygen/token');
      const json = await res.json();

      if (!json.token) {
        throw new Error('No token received from server');
      }
      console.log('🎭 [Page] Initializing avatar with token...');

      // Start the avatar session
      const { room, ws } = await initAvatarSession({
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

      roomRef.current = room;
      wsRef.current = ws;
      console.log('🚀 [Page] Avatar initialized successfully');

    } catch (err: any) {
      console.error('💥 [Page] Avatar initialization error:', err);
      
      // Handle concurrent limit error
      if (err.message?.includes('Concurrent limit reached')) {
        setError('HeyGen concurrent limit reached. Please wait a few minutes and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to initialize avatar');
      }
      
      // Reset states on error
      cleanup();
    } finally {
      setIsInitializing(false);
    }
  }

  // Initialize on mount
  useEffect(() => {
    initializeAvatar();
    return cleanup;
  }, []);

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

      // Get avatar ready
      const { ws } = await waitForAvatar();

      // TODO: Transcribe audio and get GPT response
      const text = 'Hello, how can I help you today?';

      // Speak the response
      await speakWithAvatar(ws, text);

    } catch (err) {
      console.error('❌ [Page] Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Error processing audio');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm">
        <h1 className="text-4xl font-bold mb-8">IBW Virtual Advisor</h1>

        {/* Video display */}
        <div className="relative aspect-video w-full mb-8 bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
          {!isAvatarReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                <p>Initializing avatar...</p>
              </div>
            </div>
          )}
        </div>

        {/* Error display with retry button */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            <p className="mb-2">{error}</p>
            <button
              onClick={initializeAvatar}
              disabled={isInitializing}
              className={`px-4 py-2 rounded bg-red-600 text-white ${
                isInitializing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
              }`}
            >
              {isInitializing ? 'Retrying...' : 'Retry Now'}
            </button>
          </div>
        )}

        {/* Audio capture */}
        <div className="mt-4">
          <AudioCapture onAudioReady={handleAudioChunk} disabled={!isAvatarReady || isProcessing} />
        </div>

        {/* Transcript display */}
        {transcript && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700">{transcript}</p>
          </div>
        )}
      </div>
    </main>
  );
}
