import os
import chromadb
from chromadb.config import Settings

def start_chroma():
    # Get the absolute path to the chroma_db directory
    db_path = os.path.join(os.getcwd(), 'chroma_db')
    
    # Create the directory if it doesn't exist
    os.makedirs(db_path, exist_ok=True)
    
    # Initialize the persistent client
    client = chromadb.PersistentClient(
        path=db_path,
        settings=Settings(
            allow_reset=True,
            anonymized_telemetry=False
        )
    )
    
    print(f"✨ ChromaDB server started with persistent storage at {db_path}")
    print("🔄 Press Ctrl+C to stop the server")
    
    # Keep the script running
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\n👋 ChromaDB server stopped")

if __name__ == "__main__":
    start_chroma() 