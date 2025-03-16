import chromadb
import sys
import os
from chromadb.config import Settings
from openai import OpenAI
from dotenv import load_dotenv

def get_embedding(text: str, client: OpenAI) -> list[float]:
    """Get embedding for text using OpenAI's API."""
    # Handle empty or whitespace-only queries
    if not text.strip():
        raise ValueError("Query text cannot be empty")
        
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        encoding_format="float"
    )
    return response.data[0].embedding

def query_collection(query_text):
    try:
        # Validate input
        if not query_text or not query_text.strip():
            print("Error: Query text cannot be empty")
            sys.exit(1)
            
        # Find and load the correct .env file
        current_dir = os.getcwd()
        if 'ibw-virtual-advisor' not in current_dir:
            current_dir = os.path.join(current_dir, 'ibw-virtual-advisor')
        env_path = os.path.join(current_dir, '.env')
        load_dotenv(env_path)
        
        # Check for OpenAI API key
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            print(f"Error: OPENAI_API_KEY environment variable is not set")
            print(f"Looked for .env file at: {env_path}")
            sys.exit(1)
        
        # Initialize OpenAI client
        openai_client = OpenAI(api_key=api_key)
        
        # Get embedding for query
        print("Getting embedding for query...")
        try:
            query_embedding = get_embedding(query_text, openai_client)
        except Exception as e:
            print(f"Error generating embedding: {str(e)}")
            sys.exit(1)
        
        # Initialize ChromaDB client with correct path
        db_path = os.path.join(current_dir, 'chroma_db')
        
        print(f"Using database path: {db_path}")
        client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(
                allow_reset=True,
                anonymized_telemetry=False
            )
        )
        
        # Get the collection directly (we know it exists from ingest)
        try:
            collection = client.get_collection("uni_knowledge")
            print(f"\nUsing collection: uni_knowledge")
            print(f"Collection contains {collection.count()} documents\n")
        except Exception as e:
            print(f"Error accessing collection: {str(e)}")
            sys.exit(1)
        
        # Query the collection
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=2
        )
        
        # Print results
        if not results['documents'][0]:
            print("No results found for your query.")
            return
            
        for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
            print(f"\nResult {i+1}:")
            print(f"Title: {metadata['title']}")
            print(f"Section: {metadata['section']}")
            print(f"Source: {metadata['source']}")
            print("\nRelevant Content:")
            print(doc)
            print("-" * 80)
            
    except Exception as e:
        print(f"An unexpected error occurred: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide a query string")
        sys.exit(1)
    
    query_text = " ".join(sys.argv[1:])
    query_collection(query_text) 