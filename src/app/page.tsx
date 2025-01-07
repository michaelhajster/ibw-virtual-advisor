'use client';

import { useEffect, useRef, useState } from 'react';
import AudioCapture from '@/components/AudioCapture';
import { getAssistantResponse } from '@/lib/openaiAssistant';
import { initAvatarSession, speakWithAvatar } from '@/lib/heygenClient';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [transcript, setTranscript] = useState('');
  const [avatarReady, setAvatarReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Initialize HeyGen avatar when component mounts
    const setupAvatar = async () => {
      try {
        await initAvatarSession({
          onStreamReady: (stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
              setAvatarReady(true);
            }
          }
        });
      } catch (err) {
        console.error('Failed to initialize avatar:', err);
      }
    };

    setupAvatar();
  }, []);

  async function handleAudioChunk(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append('audio', blob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: blob
      });

      const data = await response.json();
      if (data.transcript) {
        setTranscript(prev => prev + ' ' + data.transcript);
      }
    } catch (err) {
      console.error('Error processing audio chunk:', err);
    }
  }

  async function handleAskQuestion() {
    if (!transcript.trim() || processing) return;

    setProcessing(true);
    try {
      const answer = await getAssistantResponse(transcript);
      await speakWithAvatar(answer);
      setTranscript(''); // Clear transcript after processing
    } catch (err) {
      console.error('Error processing question:', err);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen p-8 flex flex-col items-center gap-8">
      <h1 className="text-3xl font-bold">IBW Virtual Advisor</h1>
      
      {/* Avatar Video Feed */}
      <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        {!avatarReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="text-white">Initializing Avatar...</div>
          </div>
        )}
      </div>

      {/* Audio Controls & Transcript */}
      <div className="w-full max-w-2xl space-y-4">
        <AudioCapture onAudioChunk={handleAudioChunk} />
        
        <div className="p-4 bg-gray-50 rounded-lg min-h-[100px]">
          <h3 className="font-medium mb-2">Transcript:</h3>
          <p className="text-gray-700">{transcript || 'Start speaking...'}</p>
        </div>

        <button
          onClick={handleAskQuestion}
          disabled={!avatarReady || !transcript.trim() || processing}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
            !avatarReady || !transcript.trim() || processing
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {processing ? 'Processing...' : 'Ask Question'}
        </button>
      </div>
    </main>
  );
}
