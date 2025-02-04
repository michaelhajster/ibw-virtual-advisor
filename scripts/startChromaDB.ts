import { ChromaClient } from 'chromadb';

async function startChromaDB() {
  try {
    console.log('Starting ChromaDB connection test...');
    const client = new ChromaClient({
      path: 'http://localhost:8000'
    });

    // Test connection
    await client.heartbeat();
    console.log('✅ ChromaDB is running and accessible');
    
    // List collections to verify functionality
    const collections = await client.listCollections();
    console.log('📚 Available collections:', collections);
  } catch (error) {
    console.error('❌ ChromaDB connection failed:', error);
    console.log('\n🔧 Please make sure ChromaDB server is running:');
    console.log('1. Install ChromaDB server: pip install chromadb');
    console.log('2. Start the server: chroma run --path /tmp/chromadb');
  }
}

startChromaDB(); 