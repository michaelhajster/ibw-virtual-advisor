# IBW Virtual Advisor - Vector Store Integration

This directory contains the transformed data and vector store implementation for the IBW Virtual Advisor.

## Data Structure

- `/data/transformed/` - Contains chunked and processed data from the HS Aalen website
- `/src/vectorstore.js` - ChromaDB integration for vector storage and search

## Setup

1. Install required dependencies:
```bash
npm install chromadb langchain
```

2. Set up your OpenAI API key:
```bash
export OPENAI_API_KEY='your-key-here'
```

3. Initialize and use the vector store:
```javascript
const VectorStore = require('./src/vectorstore');

async function search() {
  const store = new VectorStore();
  await store.init();
  const results = await store.search("your query here");
  return results;
}
```

## Data Sources

The data in this directory was scraped from the following HS Aalen pages:
- International Business Program Overview
- Course Information
- Staff Directory
- Downloads
- Research Information

Last updated: 2025-01-30T22:16:02.697Z
