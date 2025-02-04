# IBW Virtual Advisor

Next.js + ChromaDB application for IBW content management and virtual advisor with HeyGen Avatar integration.

## Architecture

The application consists of two main components:

1. **Next.js Application (Port 3000)**
   - Frontend UI
   - API Endpoints:
     - `/api/vector` - Vector search endpoint (ChromaDB integration)
     - `/api/heygen/token` - HeyGen token endpoint
     - `/api/chat` - Chat endpoint
     - `/api/transcribe` - Audio transcription endpoint

2. **ChromaDB Integration**
   - Integrated directly into Next.js via the Vector API
   - No separate server needed
   - Collection: `ibw_collection` (stores program information)

## Setup & Running

1. **Environment Setup**
   ```bash
   # Install dependencies
   npm install

   # Create .env.local with required keys
   OPENAI_API_KEY=your_openai_key
   HEYGEN_API_KEY=your_heygen_key
   ```

2. **Starting the Application**
   ```bash
   cd ibw-virtual-advisor
   npm run dev    # Runs on http://localhost:3000
   ```

3. **Stopping the Application**
   - Use `Ctrl + C` in the terminal window
   - Or if needed: `pkill -f "next dev"`

## Troubleshooting

1. **Port Issues**
   ```bash
   # Check if port is in use
   lsof -i :3000
   
   # Kill process if needed
   kill -9 <PID>
   ```

2. **Clean Restart**
   ```bash
   # Kill all Next.js processes
   pkill -f "next dev"
   
   # Clear Next.js cache if needed
   rm -rf .next
   
   # Restart
   npm run dev
   ```

3. **HeyGen Avatar**
   - Free plan has session limits
   - If 401 errors occur, wait a few minutes before trying again
   - One session at a time only

## API Endpoints

1. **Vector Search (`/api/vector`)**
   - POST request with `{ query: "your search" }`
   - Returns relevant documents from ChromaDB

2. **HeyGen Token (`/api/heygen/token`)**
   - GET request
   - Returns session token for avatar initialization

3. **Chat (`/api/chat`)**
   - POST request with `{ transcript: "user message" }`
   - Returns AI response

4. **Transcribe (`/api/transcribe`)**
   - POST request with audio blob
   - Returns transcribed text

## Best Practices

1. **Running the App**
   - Always run only one instance
   - Keep terminal window open for logs
   - Check for existing processes before starting

2. **Development**
   - Monitor console for errors
   - Check terminal for API logs
   - Use browser dev tools for debugging

## Known Limitations

1. **HeyGen Integration**
   - Free plan has session limits
   - One active session at a time
   - Wait between sessions if 401 errors occur

2. **ChromaDB**
   - Collection loaded on startup
   - Changes require application restart

Last updated: 2024-01-31
