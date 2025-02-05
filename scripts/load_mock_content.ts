const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const nodeFetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

interface MockDocument {
    markdown: string;
    metadata: Record<string, any>;
}

interface MockData {
    metadata: Record<string, any>;
    documents: MockDocument[];
}

function sanitizeMetadata(metadata: Record<string, any>): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(metadata)) {
        if (Array.isArray(value)) {
            sanitized[key] = value.join(', ');
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = JSON.stringify(value);
        } else if (['string', 'number', 'boolean'].includes(typeof value)) {
            sanitized[key] = value;
        } else {
            sanitized[key] = String(value);
        }
    }
    return sanitized;
}

async function loadMockData() {
    console.log('Loading mock data...');
    
    // Read mock content
    const filePath = path.join(process.cwd(), 'data', 'mock_ibw_content.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContents) as MockData;

    // Extract documents and metadata
    const documents = jsonData.documents.map(doc => doc.markdown);
    const metadatas = jsonData.documents.map(doc => sanitizeMetadata(doc.metadata));
    const ids = documents.map(() => uuidv4());

    console.log(`Found ${documents.length} documents to process`);

    // Get embeddings from OpenAI
    console.log('Getting embeddings from OpenAI...');
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: documents,
        encoding_format: "float"
    });
    const embeddings = response.data.map((item: { embedding: number[] }) => item.embedding);

    // Send data to persistent server
    console.log('Sending data to ChromaDB server...');
    const serverResponse = await nodeFetch('http://127.0.0.1:8000/add_documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, metadatas, embeddings, ids }),
    });

    const result = await serverResponse.json();
    console.log('Result from add_documents:', result);
}

loadMockData().catch(console.error); 

