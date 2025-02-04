import { ChromaService } from '../__mocks__/chromaClient';

jest.mock('../lib/chromaClient');

describe('Vector Search', () => {
  let chromaService: ChromaService;

  beforeAll(async () => {
    chromaService = await ChromaService.getInstance();
  });

  describe('Query Functionality', () => {
    test('should return relevant documents for exact match query', async () => {
      const query = 'What are the ECTS points for Business Mathematics?';
      const result = await chromaService.query(query);
      const data = JSON.parse(result);
      
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results[0].document).toContain('Business Mathematics');
      expect(data.results[0].metadata).toHaveProperty('title');
    });

    test('should return relevant documents for semantic query', async () => {
      const query = 'Tell me about studying abroad and international experience';
      const result = await chromaService.query(query);
      const data = JSON.parse(result);
      
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results[0].document).toContain('Study Abroad');
    });

    test('should handle empty query gracefully', async () => {
      const query = '';
      const result = await chromaService.query(query);
      const data = JSON.parse(result);
      
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Query text cannot be empty');
    });

    test('should handle very long queries', async () => {
      const query = 'Tell me about '.repeat(100) + 'Business Mathematics';
      const result = await chromaService.query(query);
      const data = JSON.parse(result);
      
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results[0].document).toContain('Business Mathematics');
    });
  });

  describe('Result Quality', () => {
    test('should return most relevant document first', async () => {
      const query = 'What are the requirements for the Bachelor thesis?';
      const result = await chromaService.query(query);
      const data = JSON.parse(result);
      
      expect(data.results[0].document).toContain('Bachelor Thesis');
      expect(data.results[0].document).toContain('ECTS');
    });

    test('should include metadata in results', async () => {
      const query = 'Tell me about the program structure';
      const result = await chromaService.query(query);
      const data = JSON.parse(result);
      
      expect(data.results[0].metadata).toHaveProperty('title');
      expect(data.results[0].metadata).toHaveProperty('section');
      expect(data.results[0].metadata).toHaveProperty('source');
    });

    test('should handle non-existent topics gracefully', async () => {
      const query = 'Tell me about quantum physics courses';
      const result = await chromaService.query(query);
      const data = JSON.parse(result);
      
      expect(data.results).toBeDefined();
      expect(data.results.length).toBeGreaterThan(0);
      // Should return default overview response
      expect(data.results[0].metadata.title).toBe('Program Overview');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed queries', async () => {
      const query = { invalid: 'query' } as any;
      const result = await chromaService.query(query);
      const data = JSON.parse(result);
      
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Invalid query type');
    });
  });
}); 