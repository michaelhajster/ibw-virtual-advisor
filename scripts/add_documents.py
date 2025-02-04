import sys
import json
import traceback
import os

try:
    import chromadb
except ImportError as e:
    print(json.dumps({
        "error": f"Failed to import ChromaDB: {str(e)}",
        "traceback": traceback.format_exc()
    }))
    sys.exit(1)

def add_documents():
    try:
        # Parse input data
        data = json.loads(sys.argv[1])
        documents = data['documents']
        embeddings = data['embeddings']
        metadatas = data.get('metadatas', [{}] * len(documents))  # Optional field with default empty metadata

        print(json.dumps({"status": "Initializing ChromaDB..."}), flush=True)
        
        # Initialize ChromaDB with persistent storage
        db_path = os.path.join(os.getcwd(), 'chroma_db')
        client = chromadb.PersistentClient(path=db_path)

        print(json.dumps({"status": "Getting collection..."}), flush=True)
        
        # Get or create collection
        collection = client.get_or_create_collection('uni_knowledge')

        # Generate IDs
        ids = [f"id_{i}" for i in range(len(documents))]

        print(json.dumps({
            "status": f"Adding {len(documents)} documents...",
            "collection": collection.name
        }), flush=True)

        # Add documents
        collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )

        print(json.dumps({
            "success": True,
            "message": f"Added {len(documents)} documents to collection {collection.name}"
        }))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    add_documents() 