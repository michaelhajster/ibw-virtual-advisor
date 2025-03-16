import OpenAI from 'openai';
import { createDataStream } from 'ai';

let threadId: string | null = null;

const ASSISTANT_ID = 'asst_2HtL1rl7oc8Z1T4ShRI7lA40';

export async function getStreamingResponse(userMessage: string) {
  const startTime = Date.now();
  console.log('\n🕒 ===== ASSISTANT TIMING LOG =====');
  console.log('⏱️ [0ms] Starting response generation...');
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    dangerouslyAllowBrowser: false,
  });

  // If no thread exists, create one
  if (!threadId) {
    console.log('⏱️ Creating new thread...');
    const thread = await client.beta.threads.create();
    threadId = thread.id;
    console.log(`⏱️ [${Date.now() - startTime}ms] Thread created`);
  }

  // Add user message to the thread
  console.log('⏱️ Adding message to thread...');
  await client.beta.threads.messages.create(threadId, {
    role: 'user',
    content: userMessage,
  });
  console.log(`⏱️ [${Date.now() - startTime}ms] Message added to thread`);

  // Create a run and get its stream
  console.log('⏱️ Starting assistant stream...');
  const stream = await client.beta.threads.runs.createAndStream(threadId, {
    assistant_id: ASSISTANT_ID,
  });
  console.log(`⏱️ [${Date.now() - startTime}ms] Stream started`);

  let firstChunkReceived = false;
  let firstSentenceReceived = false;
  let totalChunks = 0;
  let currentSentence = '';

  // Convert the stream to text chunks
  const textEncoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.event === 'thread.message.delta' && 
          chunk.data?.delta?.content && 
          chunk.data.delta.content[0]?.type === 'text' &&
          chunk.data.delta.content[0].text?.value
        ) {
          const text = chunk.data.delta.content[0].text.value;
          totalChunks++;
          currentSentence += text;

          // Log first chunk timing
          if (!firstChunkReceived) {
            firstChunkReceived = true;
            console.log(`⏱️ [${Date.now() - startTime}ms] First text chunk received`);
          }

          // Log first complete sentence timing
          if (!firstSentenceReceived && /[.!?]\s*$/.test(currentSentence)) {
            firstSentenceReceived = true;
            console.log(`⏱️ [${Date.now() - startTime}ms] First complete sentence: "${currentSentence.trim()}"`);
            currentSentence = '';
          }

          controller.enqueue(textEncoder.encode(text));
        }
      }
      console.log(`⏱️ [${Date.now() - startTime}ms] Stream completed (${totalChunks} chunks total)`);
      console.log('🕒 ================================\n');
      controller.close();
    },
  });

  return new Response(readable);
}

export async function getAssistantResponse(userMessage: string): Promise<string> {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      dangerouslyAllowBrowser: false,
    });

    // If no thread, create a new one
    if (!threadId) {
      const thread = await client.beta.threads.create();
      threadId = thread.id;
    }

    // Add user message
    await client.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userMessage,
    });

    // Create a run referencing the existing assistant
    const run = await client.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: ASSISTANT_ID
    });

    if (run.status === 'completed') {
      // fetch messages
      const messages = await client.beta.threads.messages.list(threadId);
      const lastAssistantMsg = messages.data.filter(
        (m) => m.role === 'assistant'
      ).pop();

      if (lastAssistantMsg?.content[0]?.type === 'text') {
        return lastAssistantMsg.content[0].text.value;
      }
    }

    return "Sorry, I'm not sure.";
  } catch (err) {
    console.error("Error in getAssistantResponse:", err);
    return "An error occurred while contacting GPT.";
  }
} 