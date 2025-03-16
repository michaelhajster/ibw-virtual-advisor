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

## Setup and Running Instructions

### Prerequisites
- Node.js and npm (on Mac, install via `brew install node`)
- Python 3.x (on Mac, install via `brew install python@3.13`)
- OpenAI API key
- HeyGen API key

### macOS-Specific Setup

1. Install Homebrew if not already installed:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Install required system dependencies:
```bash
# Install Python and Node.js
brew install python@3.13 node

# Make sure pip is up to date
python3 -m pip install --upgrade pip
```

3. Clone the repository and install Node dependencies:
```bash
git clone <repository-url>
cd ibw-virtual-advisor
npm install
```

4. Set up environment variables:
Create a `.env.local` file in the root directory with:
```
OPENAI_API_KEY="your-openai-api-key"
NEXT_PUBLIC_HEYGEN_API_KEY="your-heygen-api-key"
```

5. Set up Python environment and dependencies:
```bash
# Create and activate virtual environment
# IMPORTANT: On macOS, always use a virtual environment to avoid system Python issues
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install fastapi uvicorn chromadb openai
```

### Running the Application

The application requires two servers to be running simultaneously:

1. Start the ChromaDB server (in a terminal with venv activated):
```bash
# Make sure you're in the project root
cd ibw-virtual-advisor

# Activate virtual environment
source venv/bin/activate

# Export OpenAI API key from .env.local
export OPENAI_API_KEY=$(grep OPENAI_API_KEY .env.local | cut -d '=' -f2 | tr -d '"')

# Start the server with correct Python path
PYTHONPATH=. python3 scripts/persistent_chroma_server.py
```

2. Start the Next.js development server (in a new terminal):
```bash
cd ibw-virtual-advisor
npm run dev
```

3. Load the mock content (optional, in a new terminal):
```bash
cd ibw-virtual-advisor
npx ts-node scripts/load_mock_content.ts
```

### macOS-Specific Troubleshooting

1. **Python Environment Issues**
   ```bash
   # If you see "externally-managed-environment" error:
   # ALWAYS use a virtual environment on macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Port Already in Use**
   ```bash
   # Check for processes using ports 3000 or 8000
   lsof -i :3000
   lsof -i :8000
   
   # Kill processes if needed
   kill -9 <PID>
   ```

3. **Python Path Issues**
   ```bash
   # Always run the Python server with PYTHONPATH set
   PYTHONPATH=. python3 scripts/persistent_chroma_server.py
   ```

4. **Permission Issues**
   ```bash
   # If you see permission errors with pip
   python3 -m pip install --user <package>
   ```

5. **Homebrew Issues**
   ```bash
   # Update Homebrew and packages
   brew update
   brew upgrade
   ```

The application should now be running at:
- Frontend: http://localhost:3000
- ChromaDB Server: http://localhost:8000

### Testing the Setup

1. Open http://localhost:3000 in your browser
2. Click "Start Conversation" to initialize the avatar
3. Try asking a question about the IBW program

### Troubleshooting

- If the ChromaDB server fails to start, ensure:
  - The virtual environment is activated
  - The OPENAI_API_KEY is properly exported
  - You're in the project root directory
  - PYTHONPATH is set correctly

- If the Next.js server fails to start, ensure:
  - All Node dependencies are installed
  - The .env.local file exists with proper API keys
  - Port 3000 is not in use

- If the avatar doesn't initialize:
  - Check the browser console for errors
  - Verify your HeyGen API key is valid
  - Ensure all API endpoints are responding correctly

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
