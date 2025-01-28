'use client';

import { useEffect, useRef, useState } from 'react';
import AudioCapture from '@/components/AudioCapture';
import { startAvatarSession, onStream, speakText, stopAvatarSession, processStreamedText } from '@/lib/avatarClient';

// Add global error handler
if (typeof window !== 'undefined') {
  window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global error:', { msg, url, lineNo, columnNo, error });
    return false;
  };
}

export default function Home() {
  console.log('[Page] Component mounted'); // Add this line to verify component mounting

  const [isInitializing, setIsInitializing] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch the base64 token from our /api/heygen/token route
  async function fetchHeyGenToken() {
    try {
      console.log('[Page] Fetching HeyGen token...');
      const res = await fetch('/api/heygen/token');
      const data = await res.json();
      
      if (data.error) {
        throw new Error(`Token API error: ${data.error}`);
      }
      
      if (!data.token) {
        throw new Error('No token from /api/heygen/token');
      }
      
      console.log('[Page] Got heygen token:', data.token.slice(0, 10) + '...');
      return data.token;
    } catch (err) {
      console.error('[Page] Failed to fetch token:', err);
      throw new Error(`Failed to get HeyGen token: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Initialize the avatar session
  async function initializeAvatar() {
    if (isInitializing) return;
    try {
      setIsInitializing(true);
      setError(null);
      console.log('[Page] Starting avatar initialization...');

      // 1) Get the token
      const token = await fetchHeyGenToken();

      // 2) Start the session
      console.log('[Page] Starting avatar session...');
      await startAvatarSession(token);

      // 3) Listen for the media stream
      console.log('[Page] Setting up stream listener...');
      onStream((stream) => {
        console.log('[Page] Got media stream, attaching to video...');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .then(() => {
              console.log('[Page] Video playing successfully');
              setAvatarReady(true);
            })
            .catch((err) => {
              console.error('[Page] Failed to play video:', err);
              throw err;
            });
        } else {
          console.error('[Page] No video element reference');
          throw new Error('Video element not found');
        }
      });

      console.log('[Page] Avatar session initialized successfully');
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('[Page] Avatar initialization failed:', errorMessage);
      setError(errorMessage);
      setAvatarReady(false);
    } finally {
      setIsInitializing(false);
    }
  }

  // Modified useEffect to depend on hasUserInteracted
  useEffect(() => {
    if (hasUserInteracted) {
      initializeAvatar();
    }
    return () => {
      stopAvatarSession().catch(console.error);
    };
  }, [hasUserInteracted]);

  // Called when user finishes audio
  const handleAudioChunk = async (audioBlob: Blob) => {
    if (!avatarReady || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1) Transcribe
      console.log('[Page] Transcribing...');
      const transRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: audioBlob,
      });
      if (!transRes.ok) throw new Error(`/api/transcribe error: ${transRes.status}`);
      const transData = await transRes.json();
      if (transData.error) throw new Error(`Transcribe error: ${transData.error}`);

      const userText = transData.transcript;
      console.log('[Page] user text =', userText);

      // 2) GPT with streaming
      console.log('[Page] calling /api/chat with streaming...');
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: userText, streaming: true }),
      });

      if (!chatRes.ok) throw new Error(`/api/chat error: ${chatRes.status}`);
      
      // Handle streaming response
      const reader = chatRes.body?.getReader();
      const decoder = new TextDecoder();
      let gptAnswer = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            gptAnswer += chunk;
            
            // Process the chunk for the avatar to speak
            await processStreamedText(chunk);
          }
        } finally {
          reader.releaseLock();
        }
      }

      // 3) Update transcript
      setTranscript((prev) => prev + `\nYou: ${userText}\nAvatar: ${gptAnswer}`);
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {!hasUserInteracted ? (
        <button
          onClick={() => setHasUserInteracted(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Start Conversation
        </button>
      ) : (
        <>
          <div className="relative">
            {isInitializing && <div>Initializing avatar...</div>}
            {error && <div className="text-red-500">{error}</div>}
            <video
              ref={videoRef}
              style={{ width: '100%', maxWidth: '800px' }}
              playsInline
            />
          </div>
          {avatarReady && <AudioCapture onAudioChunk={handleAudioChunk} disabled={isProcessing} />}
          {transcript && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p>{transcript}</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}