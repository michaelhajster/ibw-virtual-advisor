import React from 'react';

interface VideoSectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isInitializing: boolean;
  isSpeaking: boolean;
  error: string | null;
}

export default function VideoSection({ videoRef, isInitializing, isSpeaking, error }: VideoSectionProps) {
  return (
    <div className="h-[400px] md:h-[450px] lg:h-[500px] w-full">
      <div className="relative w-full h-full rounded-xl overflow-hidden border border-gray-200 bg-white">
        {/* Loading State - Simpler */}
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-30">
            <div className="w-10 h-10 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
            <p className="mt-3 text-gray-700 text-sm">Avatar wird initialisiert...</p>
          </div>
        )}
        
        {/* Error Display - Simpler */}
        {error && (
          <div className="absolute top-4 left-0 right-0 mx-auto w-max max-w-[90%] z-30">
            <div className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm">
              {error}
            </div>
          </div>
        )}
        
        {/* Main Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover bg-gray-50"
          playsInline
        />
        
        {/* Speaking Indicator - Subtle */}
        {isSpeaking && (
          <div className="absolute bottom-4 left-4 px-2 py-1 bg-white/90 rounded text-xs text-gray-700 z-20">
            Spricht...
          </div>
        )}
      </div>
    </div>
  );
} 