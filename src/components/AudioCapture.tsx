import { useRef, useState, useEffect } from 'react';

interface AudioCaptureProps {
  onAudioChunk: (blob: Blob) => void;
  disabled?: boolean;
}

export default function AudioCapture({ onAudioChunk, disabled }: AudioCaptureProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>('');
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      // Reset state
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Whisper preferred sample rate
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      console.log('🎤 [AudioCapture] Got media stream');

      // Use WebM with Opus codec for Whisper compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      console.log('🎵 [AudioCapture] Using MIME type:', mimeType);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      // Collect chunks
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('📦 [AudioCapture] Chunk collected:', {
            size: event.data.size,
            type: event.data.type,
            totalChunks: chunksRef.current.length
          });
        }
      };

      mediaRecorderRef.current.onstart = () => {
        console.log('▶️ [AudioCapture] Recording started');
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('⏹️ [AudioCapture] Recording stopped');
        
        // Combine all chunks and send
        if (chunksRef.current.length > 0) {
          const finalBlob = new Blob(chunksRef.current, { type: mimeType });
          console.log('📼 [AudioCapture] Final audio blob:', {
            size: finalBlob.size,
            type: finalBlob.type,
            chunks: chunksRef.current.length
          });
          onAudioChunk(finalBlob);
        }
      };

      mediaRecorderRef.current.onerror = (err) => {
        console.error('❌ [AudioCapture] MediaRecorder error:', err);
        setError('Recording error occurred');
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError('');

    } catch (err) {
      console.error('❌ [AudioCapture] Setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🛑 [AudioCapture] Stopping recording...');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🎵 [AudioCapture] Track stopped:', track.kind);
      });
      setIsRecording(false);
    }
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        console.log('🧹 [AudioCapture] Stopping recording on cleanup');
        mediaRecorderRef.current.stop();
      }
      
      // Clean up media stream tracks
      if (mediaRecorderRef.current?.stream) {
        console.log('🧹 [AudioCapture] Cleaning up media stream tracks');
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!!error || disabled}
        className={`px-4 py-2 rounded-md text-sm font-normal transition-all shadow-sm ${
          isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[#0066CC] hover:bg-[#0071E3] text-white'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2">
          {isRecording ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>Aufnahme beenden</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Frage stellen</span>
            </>
          )}
        </div>
      </button>

      {/* Schlichtere Fehlermeldung */}
      {error && (
        <div className="mt-2 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  );
} 