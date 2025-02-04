import json
from query import query_collection

# Test queries
test_queries = [
    "What are the career prospects for International Business graduates?",
    "Tell me about the faculty research",
    "What international opportunities are available?"
]

def main():
    print("Testing queries on the IBW knowledge base...\n")
    
    for query in test_queries:
        print(f"Query: {query}")
        print("-" * 80)
        
        results = query_collection(query)
        
        if "error" in results:
            print(f"❌ Error: {results['error']}")
            print(f"Traceback: {results['traceback']}")
        else:
            print(f"Found {len(results['results'])} results:\n")
            for i, result in enumerate(results['results'], 1):
                print(f"Result {i} (distance: {result['distance']:.4f}):")
                print(f"Title: {result['metadata'].get('title', 'No title')}")
                print(f"Content: {result['document'][:200]}...")
                print()
        
        print("=" * 80 + "\n")

if __name__ == "__main__":
    main() 