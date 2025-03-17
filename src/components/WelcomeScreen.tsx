import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12 relative z-10">
      <div className="w-16 h-16 mb-8 flex items-center justify-center">
        <svg className="w-10 h-10 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
      
      <h1 className="text-2xl sm:text-3xl font-normal mb-4 text-gray-900">
        IBW Virtual <span className="text-[#0066CC]">Advisor</span>
      </h1>
      
      <p className="text-gray-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
        Sprechen Sie mit unserem KI-gestützten Berater für personalisierte Informationen und erhalten Sie sofortige Antworten auf Ihre Fragen.
      </p>
      
      <button
        onClick={onStart}
        className="btn btn-primary shadow-sm px-4 py-2 text-sm"
      >
        <span>Gespräch starten</span>
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
      
      <div className="mt-12 text-xs text-gray-400">
        <p>Powered by HeyGen & OpenAI</p>
      </div>
    </div>
  );
} 