import { generateEmbeddings } from './embeddings';
import type { VectorizeIndex, Ai } from '@cloudflare/workers-types';

export type SearchResult = {
  chunkId: string;
  source: string;
  documentTitle: string;
  pageContent: string;
  score: number;
};

export async function semanticSearch(
  ai: Ai,
  vectorize: VectorizeIndex,
  query: string,
  userId?: string,
  topK = 5,
): Promise<SearchResult[]> {

  const [embedding] = await generateEmbeddings(ai, [query]);

  const results = await vectorize.query(embedding, {
    topK,
    returnMetadata: true,
    returnValues: false,
    filter: userId ? { userId } : undefined,
  });


  return results.matches.map((match) => ({
    chunkId: match.metadata?.chunkId as string,
    source: match.metadata?.source as string,
    documentTitle: (match.metadata?.documentTitle as string) ?? 'unknown',
    pageContent: (match.metadata?.pageContent as string) ?? 'unknown',
    score: match.score,
  }));
}
