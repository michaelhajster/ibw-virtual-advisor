import { spawn } from 'child_process';
import { join } from 'path';
import { OpenAI } from 'openai';
import env from './env';

export class ChromaService {
  private static instance: ChromaService;
  private openai: OpenAI;
  private baseDir: string;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
    // Set base directory to the project root
    this.baseDir = process.cwd();
  }

  public static async getInstance(): Promise<ChromaService> {
    if (!ChromaService.instance) {
      ChromaService.instance = new ChromaService();
    }
    return ChromaService.instance;
  }

  private async runPythonScript(scriptName: string, jsonInput: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const scriptPath = join(this.baseDir, 'scripts', scriptName);
      const venvPath = join(this.baseDir, 'venv');
      
      console.log('Running Python script:', scriptPath);
      console.log('Virtual env path:', venvPath);
      console.log('Working directory:', this.baseDir);
      console.log('Input:', JSON.stringify(jsonInput, null, 2));
      
      const command = [
        'source',
        `"${venvPath}/bin/activate"`,
        '&&',
        'cd',
        `"${this.baseDir}"`,
        '&&',
        'python',
        `"${scriptPath}"`
      ].join(' ');

      console.log('Running command:', command);
      
      const pythonProcess = spawn('bash', ['-c', command], {
        cwd: this.baseDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          OPENAI_API_KEY: env.OPENAI_API_KEY
        }
      });
      
      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Python stdout:', output);
        outputData += output;
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('Python stderr:', error);
        errorData += error;
      });

      pythonProcess.on('close', (code) => {
        console.log('Python process exited with code:', code);
        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${errorData}`));
        } else {
          resolve(outputData);
        }
      });

      // Write input data to stdin
      pythonProcess.stdin.write(JSON.stringify(jsonInput));
      pythonProcess.stdin.end();
    });
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

      // Add documents to ChromaDB
      return await this.runPythonScript('add_documents.py', {
        documents,
        embeddings,
        metadatas
      });
    } catch (error) {
      console.error('Error adding documents:', error);
      throw error;
    }
  }

  public async query(query: string): Promise<string> {
    try {
      console.log('ChromaService: Querying with:', query);
      const result = await this.runPythonScript('query.py', { query });
      console.log('ChromaService: Query result:', result);
      return result;
    } catch (error) {
      console.error('ChromaDB query error:', error);
      return JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
} 
