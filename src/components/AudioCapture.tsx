import { useRef, useState } from 'react';

interface AudioCaptureProps {
  onAudioChunk: (blob: Blob) => void;
}

export default function AudioCapture({ onAudioChunk }: AudioCaptureProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>('');

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { 
        mimeType: 'audio/webm' 
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onAudioChunk(event.data);
        }
      };

      mediaRecorderRef.current.start(1000); // Chunk every 1 second
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Failed to access microphone. Please ensure you have granted permission.');
      console.error('Error accessing microphone:', err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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