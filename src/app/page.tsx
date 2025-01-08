'use client';

import { useEffect, useRef, useState } from 'react';
import AudioCapture from '@/components/AudioCapture';
import { startAvatarSession, onStream, speakText, stopAvatarSession } from '@/lib/avatarClient';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isAvatarReady, setAvatarReady] = useState(false);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Cleanup on unmount
  useEffect(() => {
    initializeAvatar();
    return () => {
      stopAvatarSession().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Called when user finishes audio
  async function handleAudioChunk(blob: Blob) {
    if (isProcessing) {
      console.log('[Page] busy, skip...');
      return;
    }
    setIsProcessing(true);

    try {
      // 1) Transcribe
      console.log('[Page] Transcribing...');
      const transRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: blob,
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
    } catch (err: any) {
      console.error('[Page] handleAudioChunk error:', err);
      setError(err.message || 'Audio processing error');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">IBW Virtual Advisor</h1>

      <div className="relative w-full max-w-md aspect-video bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          autoPlay
          playsInline
        />
        {!isAvatarReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <p>Initializing avatar...</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">
          <p>{error}</p>
          {!isInitializing && (
            <button
              onClick={initializeAvatar}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <AudioCapture onAudioChunk={handleAudioChunk} disabled={!isAvatarReady || isProcessing} />

      {transcript && (
        <div className="w-full max-w-md bg-gray-50 p-4 mt-3 rounded">
          <pre className="whitespace-pre-wrap">{transcript}</pre>
        </div>
      )}
    </main>
  );
}
