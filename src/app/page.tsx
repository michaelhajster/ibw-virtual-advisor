'use client';

import { useEffect, useRef, useState } from 'react';
import AudioCapture from '@/components/AudioCapture';
import { startAvatarSession, onStream, speakText, stopAvatarSession } from '@/lib/avatarClient';

export default function Home() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch the base64 token from our /api/heygen/token route
  async function fetchHeyGenToken() {
    const res = await fetch('/api/heygen/token');
    const data = await res.json();
    if (!data.token) throw new Error('No token from /api/heygen/token');
    return data.token;
  }

  // Initialize the avatar session
  async function initializeAvatar() {
    if (isInitializing) return;
    try {
      setIsInitializing(true);
      setError('');

      // 1) Get the token
      const token = await fetchHeyGenToken();
      console.log('[Page] Got heygen token:', token.slice(0, 10) + '...');

      // 2) Start the session with 'Santa_Fireplace_Front_public' in avatarClient.ts
      await startAvatarSession(token);

      // 3) Listen for the media stream
      onStream((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .then(() => {
              console.log('[Page] video playing');
              setAvatarReady(true);
            })
            .catch(console.error);
        }
      });

      console.log('[Page] Avatar session started');
    } catch (err: any) {
      console.error('[Page] initializeAvatar error:', err);
      setError(err.message || 'Avatar initialization failed');
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

      // 2) GPT
      console.log('[Page] calling /api/chat...');
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: userText }),
      });
      if (!chatRes.ok) throw new Error(`/api/chat error: ${chatRes.status}`);
      const chatData = await chatRes.json();
      if (chatData.error) throw new Error(`Chat error: ${chatData.error}`);

      const gptAnswer = chatData.response;
      console.log('[Page] GPT says:', gptAnswer);

      // 3) Let avatar speak it
      console.log('[Page] speakText -> repeat GPT');
      await speakText(gptAnswer);

      // 4) Update transcript
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
