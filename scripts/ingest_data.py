import os
import json
from openai import OpenAI
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any
import hashlib
from dotenv import load_dotenv

def get_embedding(text: str, client: OpenAI) -> List[float]:
    """Get embedding for text using OpenAI's API."""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        encoding_format="float"
    )
    return response.data[0].embedding

def generate_document_id(text: str) -> str:
    """Generate a stable ID for a document based on its content."""
    return hashlib.md5(text.encode()).hexdigest()

def prepare_metadata(metadata: Dict[str, Any]) -> Dict[str, str]:
    """Convert all metadata values to strings."""
    processed = {}
    for key, value in metadata.items():
        if isinstance(value, list):
            processed[key] = ', '.join(str(v) for v in value)
        else:
            processed[key] = str(value)
    return processed

def ingest_documents():
    try:
        # Load environment variables
        load_dotenv()
        
        # Check for OpenAI API key
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Initialize ChromaDB client
        db_path = os.path.join(os.path.dirname(os.getcwd()), 'chroma_db')
        chroma_client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(
                allow_reset=True,
                anonymized_telemetry=False
            )
        )
        
        # Get or create collection
        collection = chroma_client.get_or_create_collection(
            name="uni_knowledge",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Load mock data
        data_path = os.path.join(os.path.dirname(os.getcwd()), 'data', 'mock_ibw_content.json')
        print(f"Loading data from {data_path}")
        
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, dict) or 'documents' not in data:
            raise ValueError("Invalid JSON structure: expected object with 'documents' array")
        
        documents = data['documents']
        print(f"\nFound {len(documents)} documents to process")
        
        # Process each document
        for i, doc in enumerate(documents, 1):
            try:
                title = doc['metadata'].get('title', f'Document {i}')
                print(f"\nProcessing document {i}/{len(documents)}: {title}")
                
                # Generate document ID
                doc_id = generate_document_id(doc['markdown'])
                
                # Get embedding
                print("Getting embedding...")
                embedding = get_embedding(doc['markdown'], client)
                
                # Prepare metadata
                print("Processing metadata...")
                metadata = prepare_metadata(doc['metadata'])
                
                # Add to ChromaDB
                print("Adding to ChromaDB...")
                collection.add(
                    documents=[doc['markdown']],
                    embeddings=[embedding],
                    metadatas=[metadata],
                    ids=[doc_id]
                )
                
                print(f"✅ Successfully added: {title}")
                
            except Exception as e:
                print(f"❌ Error processing document {i}: {str(e)}")
                continue
        
        # Print final stats
        print(f"\n📊 Final Statistics:")
        print(f"- Total documents in collection: {collection.count()}")
        
    except Exception as e:
        print(f"\n❌ Fatal error during ingestion: {str(e)}")
        raise

if __name__ == "__main__":
    ingest_documents() 
