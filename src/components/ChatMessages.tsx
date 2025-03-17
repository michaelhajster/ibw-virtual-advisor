import React from 'react';

interface ChatMessagesProps {
  transcript: string;
}

export default function ChatMessages({ transcript }: ChatMessagesProps) {
  // Nachrichten aus Transkript extrahieren
  const messages = transcript
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      if (line.startsWith('You:')) {
        return { type: 'user', text: line.replace('You:', '').trim() };
      } else if (line.startsWith('Avatar:')) {
        return { type: 'avatar', text: line.replace('Avatar:', '').trim() };
      }
      return null;
    })
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <div key={index} className={`flex ${message?.type === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={message?.type === 'user' ? 'chat-bubble-user' : 'chat-bubble-avatar'}>
            {message?.text}
          </div>
        </div>
      ))}
    </div>
  );
} 