import chromadb
import sys
import os
import json
from chromadb.config import Settings
from openai import OpenAI
from dotenv import load_dotenv

def get_embedding(text: str, client: OpenAI) -> list[float]:
    """Get embedding for text using OpenAI's API."""
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
        # Load environment variables
        load_dotenv()
        
        # Get OpenAI API key
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return json.dumps({"error": "OPENAI_API_KEY not found"})
        
        # Initialize OpenAI client
        openai_client = OpenAI(api_key=api_key)
        
        # Get embedding for query
        query_embedding = get_embedding(query_text, openai_client)
        
        # Initialize ChromaDB client
        db_path = os.path.join(os.getcwd(), 'chroma_db')
        client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(
                allow_reset=True,
                anonymized_telemetry=False
            )
        )
        
        # Get collection
        collection = client.get_collection("uni_knowledge")
        
        # Query the collection
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3
        )
        
        # Format results
        formatted_results = []
        for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
            formatted_results.append({
                "document": doc,
                "metadata": metadata
            })
        
        return json.dumps({
            "results": formatted_results
        })
            
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    query_text = input_data.get('query', '')
    
    if not query_text:
        print(json.dumps({"error": "No query provided"}))
        sys.exit(1)
    
    # Process query and print results
    print(query_collection(query_text)) 