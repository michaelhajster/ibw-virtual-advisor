import fs from 'fs';
import path from 'path';
import { ChromaService } from '../src/lib/chromaClient';

async function ingestData() {
  try {
    // Read the mock data file
    const dataPath = path.join(__dirname, '../data/mock_ibw_content.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);

    // Initialize ChromaService
    const chromaService = await ChromaService.getInstance();

    // Add documents to ChromaDB
    const result = await chromaService.addDocuments(
      data.documents.map((doc: any) => doc.markdown),
      data.documents.map((doc: any) => doc.metadata)
    );

    console.log('Ingestion result:', result);
  } catch (error) {
    console.error('Error ingesting data:', error);
    process.exit(1);
  }
}

ingestData(); 