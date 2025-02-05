import os
import uuid
from fastapi import FastAPI, Request
import uvicorn
import chromadb
from chromadb.utils import embedding_functions

app = FastAPI()

# Initialize Chroma client with new configuration
client = chromadb.PersistentClient(path="./chroma_db")

# Initialize OpenAI embedding function
embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
    api_key=os.environ.get("OPENAI_API_KEY"),
    model_name="text-embedding-ada-002"
)

# Get or create collection
collection = client.get_or_create_collection(
    name="ibw_docs",
    embedding_function=embedding_fn
)

@app.post("/query")
async def query_endpoint(req: Request):
    body = await req.json()
    user_query = body.get("query")
    if not user_query:
        return {"error": "Missing `query`"}
    
    results = collection.query(
        query_texts=[user_query],
        n_results=3
    )
    
    # Format results to match existing structure
    formatted_results = []
    if results and results['documents']:
        for doc in results['documents'][0]:  # First query's results
            formatted_results.append({"document": doc})
    
    return {"results": formatted_results}

@app.post("/add_documents")
async def add_documents(req: Request):
    body = await req.json()
    documents = body.get("documents", [])
    metadatas = body.get("metadatas", [])
    embeddings = body.get("embeddings", None)
    ids = body.get("ids", [str(uuid.uuid4()) for _ in range(len(documents))])

    if not documents:
        return {"error": "No documents provided"}

    try:
        if embeddings:
            collection.add(
                documents=documents,
                metadatas=metadatas,
                embeddings=embeddings,
                ids=ids
            )
        else:
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )

        return {
            "status": "success",
            "count": len(documents)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000) 