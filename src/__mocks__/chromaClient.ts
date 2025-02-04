export class ChromaService {
  private static instance: ChromaService;
  private baseDir: string = process.cwd();

  public static async getInstance(): Promise<ChromaService> {
    if (!ChromaService.instance) {
      ChromaService.instance = new ChromaService();
    }
    return ChromaService.instance;
  }

  public async query(query: string | any): Promise<string> {
    // Handle invalid query types
    if (typeof query !== 'string') {
      return JSON.stringify({ error: "Invalid query type" });
    }

    // Handle empty queries
    if (!query.trim()) {
      return JSON.stringify({ error: "Query text cannot be empty" });
    }

    // Mock responses based on query content
    if (query.toLowerCase().includes('business mathematics')) {
      return JSON.stringify({
        results: [{
          document: "Business Mathematics I (5 ECTS)\n* Basic calculus\n* Financial mathematics\n* Statistics foundations",
          metadata: {
            title: "Course Descriptions",
            section: "Curriculum",
            source: "course_catalog"
          }
        }]
      });
    }

    if (query.toLowerCase().includes('abroad') || query.toLowerCase().includes('international')) {
      return JSON.stringify({
        results: [{
          document: "Semester 6: Study Abroad\n- International Studies (30 ECTS)\n* Course selection at partner university\n* Intercultural experience",
          metadata: {
            title: "International Opportunities",
            section: "Program Structure",
            source: "program_guide"
          }
        }]
      });
    }

    if (query.toLowerCase().includes('bachelor thesis')) {
      return JSON.stringify({
        results: [{
          document: "Bachelor Thesis (12 ECTS)\n* Research project\n* Academic writing\n* Defense presentation",
          metadata: {
            title: "Final Phase",
            section: "Program Structure",
            source: "program_guide"
          }
        }]
      });
    }

    // Default response for other queries
    return JSON.stringify({
      results: [{
        document: "The International Business program at Aalen University...",
        metadata: {
          title: "Program Overview",
          section: "General",
          source: "website"
        }
      }]
    });
  }
} 
