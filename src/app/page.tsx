'use client';

import { useEffect, useRef, useState } from 'react';
import AudioCapture from '@/components/AudioCapture';
import { startAvatarSession, onStream, speakText, stopAvatarSession, processStreamedText, interruptCurrentSpeech } from '@/lib/avatarClient';
import WelcomeScreen from '@/components/WelcomeScreen';
import VideoSection from '@/components/VideoSection';
import ChatMessages from '@/components/ChatMessages';

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
  const [isSpeaking, setIsSpeaking] = useState(false); // New state to track if avatar is speaking
  const [transcript, setTranscript] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch token directly from HeyGen API
  async function fetchHeyGenToken() {
    try {
      console.log('[Page] Fetching HeyGen token...');
      const myHeaders = new Headers();
      myHeaders.append("content-type", "application/json");
      myHeaders.append("X-Api-Key", process.env.NEXT_PUBLIC_HEYGEN_API_KEY || '');

      const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
        method: 'POST',
        headers: myHeaders,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`HeyGen API error: ${response.status} ${data.message || ''}`);
      }
      
      if (!data.data?.token) {
        throw new Error('No token received from HeyGen API');
      }
      
      console.log('[Page] Got heygen token:', data.data.token.slice(0, 10) + '...');
      return data.data.token;
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
      const startTime = Date.now();

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
      let chunkCount = 0;

      if (reader) {
        try {
          setIsSpeaking(true); // Set speaking state to true when streaming starts
          while (true) {
            const { done, value } = await reader.read();
            
            // If done, we need to process any remaining text in the buffer
            if (done) {
              console.log(`✅ [Stream] Complete: ${chunkCount} chunks in ${Date.now() - startTime}ms`);
              
              // Process any remaining text as the final chunk
              await processStreamedText('', true); // Empty chunk with isLastChunk flag
              break;
            }

            const chunk = decoder.decode(value);
            console.log(` [Stream] Chunk #${++chunkCount} received at +${Date.now() - startTime}ms:`, chunk);
            gptAnswer += chunk;
            
            // Process the chunk for the avatar to speak
            // Mark the first chunk as high priority for immediate speaking
            await processStreamedText(
              chunk, 
              false, // Not the last chunk
              chunkCount === 1 // isPriority = true nur für den ersten Chunk
            );
          }
        } finally {
          reader.releaseLock();
          setIsSpeaking(false); // Reset speaking state when streaming is done
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

  // Add handler for ending session
  const handleEndSession = async () => {
    await stopAvatarSession();
    setHasUserInteracted(false);
    setAvatarReady(false);
    setTranscript('');
  };

  // New handler for interrupting current speech
  const handleInterrupt = async () => {
    await interruptCurrentSpeech();
    setIsSpeaking(false);
    setIsProcessing(false);
    console.log('[Page] Speech interrupted, ready for new question');
  };

  return (
    <main className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8 bg-gray-50">
      {/* Inhalt */}
      {!hasUserInteracted ? (
        <WelcomeScreen onStart={() => setHasUserInteracted(true)} />
      ) : (
        <div className="w-full max-w-7xl mx-auto h-full">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Linke Seite: Video und Controls */}
            <div className="lg:w-2/3 flex flex-col gap-4">
              {/* Video Area */}
              <VideoSection 
                videoRef={videoRef}
                isInitializing={isInitializing}
                isSpeaking={isSpeaking}
                error={error}
              />
              
              {/* Controls Panel */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {isSpeaking && (
                    <button 
                      onClick={handleInterrupt}
                      className="px-3 py-1.5 rounded bg-amber-500 text-white text-sm"
                    >
                      Unterbrechen
                    </button>
                  )}
                  
                  {avatarReady && (
                    <AudioCapture 
                      onAudioChunk={handleAudioChunk} 
                      disabled={isProcessing} 
                    />
                  )}
                  
                  <button
                    onClick={handleEndSession}
                    className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 text-sm"
                  >
                    Gespräch beenden
                  </button>
                </div>
              </div>
            </div>
            
            {/* Rechte Seite: Transkript/Chat */}
            <div className="lg:w-1/3 bg-white rounded-lg border border-gray-200 p-4 lg:h-[600px] flex flex-col">
              <h2 className="text-sm font-medium text-gray-600 mb-3">
                Gesprächsverlauf
              </h2>
              
              {transcript ? (
                <div className="flex-1 overflow-y-auto pr-2 conversation-container">
                  <ChatMessages transcript={transcript} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-400 text-xs">Ihr Gesprächsverlauf erscheint hier...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}