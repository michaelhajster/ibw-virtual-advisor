Below is an **updated PRD** reflecting your current architecture with **ChromaDB**, **GPT streaming**, and the **HeyGen Streaming Avatar**. It incorporates the most recent changes and lessons learned.

---

# **IBW Virtual Advisor — Updated Product Requirements Document (PRD)**

## **1. Project Overview**

The **IBW Virtual Advisor** is a Next.js web application that provides **conversational Q&A** to prospective students using **speech input** and an **AI-driven avatar**. Specifically:

1. Users speak questions via their browser’s microphone.  
2. Audio is transcribed by **OpenAI Whisper** into text.  
3. The text is used as a **query** to a **Retrieval-Augmented Generation (RAG) pipeline**:  
   - We fetch relevant **context** from a **ChromaDB** vector store containing IBW/IBS program documents.  
   - Then we pass that context + user question to GPT to produce a final answer.  
4. The GPT response is **streamed** back chunk by chunk, and each chunk is spoken by a **HeyGen Streaming Avatar** in near real-time.  
5. The conversation unfolds in a single-page interface with an embedded video of the avatar.

**Primary Use Case**: An interactive kiosk or a web landing page for prospective students to ask about admissions, curriculum, career paths, etc.

---

## **2. Objectives**

1. **Engaging & Real-Time**  
   - A voice-driven, visually appealing “avatar” that answers promptly.  
2. **Accurate & Contextual**  
   - Pulls validated information from **Chroma** vector embeddings of official IBW resources.  
3. **Robust & Scalable**  
   - Handles concurrency constraints (e.g., 1 concurrent session on the Free HeyGen plan) gracefully.  
   - Maintains short-latency responses even as requests scale.  
4. **Easy Deployment**  
   - Single Next.js 14 project.  
   - Environment variables for secrets.  
   - Deployable on Vercel or similar hosting.

---

## **3. Core Features**

1. **Voice Capture**  
   - Browser-based microphone capture (WebRTC).  
   - Single button or push-to-talk approach.  

2. **Transcription (OpenAI Whisper)**  
   - `POST /api/transcribe` endpoint sends an audio Blob to Whisper.  
   - Returns the text transcript.  

3. **RAG Chat Flow**  
   - `POST /api/chat` calls the **ChromaDB** vector store (for relevant context) and then GPT.  
   - **Stream** GPT’s partial completions chunk by chunk back to the client.  

4. **HeyGen Streaming Avatar**  
   - The client receives text chunks from GPT and sends each sentence to the avatar in real-time.  
   - The avatar lip-syncs and speaks partial responses as they arrive.  
   - Only **1** concurrent session is allowed on the free/trial plan, so we’ll carefully close sessions when done.  

5. **User Interface (UI/UX)**  
   - Minimal design:  
     - Start conversation → Avatar video feed → transcript logs.  
   - Real-time streaming text is appended to the UI, so the user sees partial responses while the avatar speaks them.  

6. **Chroma Vector Store Integration**  
   - IBW/IBS documents are ingested as embeddings into Chroma.  
   - The server queries top relevant passages.  
   - Those passages get appended to GPT’s prompt for more accurate answers.  

---

## **4. Tech Stack & Integrations**

1. **Frontend**  
   - **Next.js 14 (App Router)**  
   - **React/TypeScript**  
   - **Tailwind CSS** for styling  
   - **Audio APIs** for mic capture  
   - **Web-based TTS** is replaced by the **HeyGen** avatar.

2. **Server**  
   - Node.js serverless routes in Next.js (e.g., `/api/transcribe`, `/api/chat`).  
   - **ChromaDB** for doc embeddings and retrieval.  
   - **OpenAI**:
     - **Whisper** (`POST /v1/audio/transcriptions`) for speech-to-text.  
     - **GPT** for final answer generation.  
   - **HeyGen**:
     - **Streaming Avatar** with a session-based token.  

3. **Deployment**  
   - **Vercel** or any Node-friendly hosting.  
   - `.env.local` with `OPENAI_API_KEY`, `HEYGEN_API_KEY`, `NEXT_PUBLIC_HEYGEN_API_KEY` as needed.  

---

## **5. Implementation Details**

### **5.1 Audio Capture**  
- **`AudioCapture`** component in the client uses `navigator.mediaDevices.getUserMedia(...)` to record.  
- On stop, it sends the final **`Blob`** to **`/api/transcribe`**.  
- Example code snippet:
  ```tsx
  // AudioCapture.tsx (simplified)
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorderRef.current.ondataavailable = (event) => {
      // Send final blob after stop
      if (event.data.size > 0) onAudioChunk(event.data);
    };

    mediaRecorderRef.current.start();
  }
  ```

### **5.2 Transcription Endpoint**  
- `POST /api/transcribe` receives the audio blob, calls **OpenAI Whisper** to get text, and returns `{ transcript }`.  
- Example:
  ```ts
  // /api/transcribe/route.ts (Next.js App Router)
  export async function POST(req: NextRequest) {
    const audioBlob = await req.blob(); 
    // Build FormData, call Whisper /v1/audio/transcriptions
    return NextResponse.json({ transcript: whisperText });
  }
  ```

### **5.3 RAG Chat Endpoint**  
- `POST /api/chat` with JSON `{ transcript, streaming: true }`.  
- The server:  
  1. Queries **Chroma** for relevant contexts.  
  2. Calls GPT with a system prompt containing these context docs.  
  3. **Streams** the GPT response.  
- The client side sets up a **ReadableStream** and processes the text in real time.  

### **5.4 Streaming GPT to the HeyGen Avatar**  
- On the client, once we read a chunk from GPT:  
  1. Append chunk to local `transcript`.  
  2. Split into sentences.  
  3. For each sentence, call the **HeyGen** `avatar.speak(...)`.  
- The avatar is initialized with `startAvatarSession(token)`, which uses:
  ```ts
  avatar = new StreamingAvatar({ token });
  avatar.createStartAvatar({
    avatarName: '73c84e2b886940099c5793b085150f2f',
    quality: 'low', // or as your plan allows
  });
  ```
- **Close** the session with `stopAvatarSession()` to avoid concurrency issues.

### **5.5 ChromaDB**  
- IBW docs ingested offline.  
- Query route: 
  ```ts
  // /api/vector/route.ts
  const chromaService = await ChromaService.getInstance();
  const results = await chromaService.query(query);
  // returns top-k doc passages
  ```
- The doc text is included in GPT’s system prompt as “Context”.

---

## **6. High-Level Flow Diagram**

1. **User** presses “Start Conversation.”  
2. **Audio** is recorded → user stops → final blob → `/api/transcribe`.  
3. The **transcript** is returned to the client.  
4. Client calls `/api/chat` with `{ transcript, streaming: true }`.  
5. **Server** fetches **Chroma** context → calls **OpenAI** (GPT) → returns chunked text stream.  
6. Client receives text chunks. For each chunk:  
   - Display partial text in UI transcript.  
   - Split completed sentence → `avatar.speak(...)` in real time.  
7. Once done, the user can record another question or end the session.  

---

## **7. Milestones & Deployment**

1. **Local Dev**  
   - Basic pipeline: Audio → Transcribe → Single GPT call → Print answer.  
2. **Integrate Chroma**  
   - Add doc retrieval. Use context in GPT prompts for accurate IBW data.  
3. **Enable GPT Streaming**  
   - Return incremental text from the server.  
   - Client logs partial chunks.  
4. **HeyGen Streaming Avatar**  
   - Acquire token from your plan / environment variable.  
   - Stream partial GPT sentences to the avatar.  
   - Ensure concurrency limit is handled (free/trial plans).  
5. **Production Deploy**  
   - Host on Vercel, store `.env.local` with `OPENAI_API_KEY` and `HEYGEN_API_KEY`.  
   - Confirm plan usage for concurrent sessions.  

---

## **8. Concurrency & Limits**

- **HeyGen** free/trial plans allow **1** concurrent streaming session. If multiple sessions open or leftover from a crash, you may see a `401 Unauthorized` or `Concurrent limit` error.  
- **OpenAI** usage charges apply for both Whisper & GPT. Monitor usage.  
- **Chroma** can run locally or via a service.  

---

## **9. Success Criteria**

1. **Real-Time Responsiveness**  
   - Under ~2s from finishing speech to avatar starting to speak.  
2. **Accurate Answers**  
   - GPT is guided by relevant IBW program documents from Chroma.  
3. **Session Stability**  
   - Close sessions cleanly to avoid concurrency errors.  
4. **Positive User Feedback**  
   - Natural-sounding voice. Minimal friction in the UI.  

---

### **End of Document**

This PRD now incorporates **Chroma-based RAG**, **GPT streaming**, and **HeyGen** concurrency requirements. You can further refine or expand each section as you finalize the product.