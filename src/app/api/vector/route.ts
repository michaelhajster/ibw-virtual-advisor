import { NextRequest, NextResponse } from 'next/server';
import { ChromaService } from '@/lib/chromaClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('Vector API: Received query:', query);
    const chromaService = await ChromaService.getInstance();
    const results = await chromaService.query(query);
    console.log('Vector API: Raw results:', results);

    try {
      // Try to parse the results
      const parsedResults = JSON.parse(results);
      console.log('Vector API: Parsed results:', parsedResults);
      
      if (parsedResults.error) {
        console.error('ChromaDB query error:', parsedResults.error);
        return NextResponse.json(
          { error: parsedResults.error },
          { status: 500 }
        );
      }

      return NextResponse.json(parsedResults);
    } catch (parseError) {
      console.error('Failed to parse results:', parseError);
      console.error('Raw results that failed to parse:', results);
      return NextResponse.json(
        { error: 'Failed to parse query results' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Vector API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 