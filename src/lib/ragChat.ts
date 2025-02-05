import OpenAI from 'openai';
import env from './env';
import { createDataStream } from 'ai';

export class RagChatService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: false,
    });
  }

  private async getContext(question: string): Promise<string> {
    const res = await fetch('http://127.0.0.1:8000/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question }),
    });

    if (!res.ok) {
      console.error('Vector API error:', await res.text());
      throw new Error('Failed to get context from vector store');
    }

    const data = await res.json();
    console.log('Vector API response:', data);
    
    if (data.error) {
      throw new Error(`Vector query failed: ${data.error}`);
    }

    // Extract documents from the results
    const documents = data.results.map((result: any) => result.document);
    if (!documents || documents.length === 0) {
      return '';
    }

    return documents.join('\n\n');
  }

  public async getStreamingResponse(userMessage: string) {
    const startTime = Date.now();
    console.log('\n🕒 ===== RAG CHAT TIMING LOG =====');
    
    // Get relevant context
    console.log('Getting context...');
    const context = await this.getContext(userMessage);
    console.log(`Context retrieved in ${Date.now() - startTime}ms`);
    console.log('Context:', context);

    // Create chat completion
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a GPT-4o Assistant called the IBW Virtual Advisor. You retrieve and reference accurate information from the provided project documents (which you can access with file search) to answer questions about the IBW program. Always reply in German or switch to the user's language if clearly identified. Keep answers short, friendly, and conversational—like a real-time spoken interaction. If you're unsure, state it rather than guessing. Above all, strive to be engaging and pleasant to talk to, ensuring users enjoy asking about university topics.

Context:
${context}`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      stream: true,
      temperature: 0.7,
    });

    console.log(`Total time: ${Date.now() - startTime}ms`);
    
    // Convert OpenAI stream to Response stream
    const textEncoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(textEncoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable);
  }

  public async getChatResponse(userMessage: string): Promise<string> {
    const startTime = Date.now();
    console.log('\n🕒 ===== RAG CHAT TIMING LOG =====');
    
    // Get relevant context
    console.log('Getting context...');
    const context = await this.getContext(userMessage);
    console.log(`Context retrieved in ${Date.now() - startTime}ms`);
    
    // Create chat completion
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a GPT-4o Assistant called the IBW Virtual Advisor. You retrieve and reference accurate information from the provided project documents (which you can access with file search) to answer questions about the IBW program. Always reply in German or switch to the user's language if clearly identified. Keep answers short, friendly, and conversational—like a real-time spoken interaction. If you're unsure, state it rather than guessing. Above all, strive to be engaging and pleasant to talk to, ensuring users enjoy asking about university topics.

Context:
${context}`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
    });

    console.log(`Total time: ${Date.now() - startTime}ms`);
    return response.choices[0].message.content || '';
  }
}

export const ragChat = new RagChatService(); 
