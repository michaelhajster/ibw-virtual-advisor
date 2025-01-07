import { useRef, useState } from 'react';

interface AudioCaptureProps {
  onAudioChunk: (blob: Blob) => void;
}

export default function AudioCapture({ onAudioChunk }: AudioCaptureProps) {
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

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-gray-600">Recording...</span>
        </div>
      )}
    </div>
  );
} 