import OpenAI from 'openai';

let threadId: string | null = null;

const ASSISTANT_ID = 'asst_2HtL1rl7oc8Z1T4ShRI7lA40';

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