import { OpenAI } from 'openai';
import env from './env';

export class ChromaService {
  private static instance: ChromaService;
  private openai: OpenAI;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
  }

  public static async getInstance(): Promise<ChromaService> {
    if (!ChromaService.instance) {
      ChromaService.instance = new ChromaService();
    }
    return ChromaService.instance;
  }

  public async addDocuments(documents: string[], metadatas: any[]): Promise<string> {
    try {
      // Get embeddings for documents
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: documents,
        encoding_format: "float"
      });

      const embeddings = response.data.map(item => item.embedding);

      // TODO: Add endpoint for adding documents to the FastAPI server
      throw new Error('Document addition not yet implemented in FastAPI server');
    } catch (error) {
      console.error('Error adding documents:', error);
      throw error;
    }
  }

  public async query(query: string): Promise<string> {
    try {
      console.log('ChromaService: Querying with:', query);
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return JSON.stringify({ error: errorText });
      }

      const data = await response.json();
      console.log('ChromaService: Query result:', data);
      return JSON.stringify(data);
    } catch (error) {
      console.error('ChromaDB query error:', error);
      return JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
} 
