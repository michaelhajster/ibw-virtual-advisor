import os
import json
import chromadb
from chromadb.config import Settings
import traceback
import sys
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

def check_collection():
    try:
        print(json.dumps({"status": "Initializing ChromaDB..."}), flush=True)
        
        # Initialize ChromaDB client with the same path as ingest_data.py
        db_path = os.path.join(os.path.dirname(os.getcwd()), 'chroma_db')
        chroma_client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(
                allow_reset=True,
                anonymized_telemetry=False
            )
        )

        print(json.dumps({"status": "Getting collection..."}), flush=True)
        
        # Get collection
        collection = chroma_client.get_collection("uni_knowledge")

        # Get collection count
        count = collection.count()
        print(json.dumps({
            "status": "Collection info",
            "count": count,
            "name": collection.name
        }), flush=True)

        # Get a sample of documents
        if count > 0:
            results = collection.peek(limit=5)
            print(json.dumps({
                "status": "Sample documents",
                "results": results
            }, cls=NumpyEncoder), flush=True)

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    check_collection() 