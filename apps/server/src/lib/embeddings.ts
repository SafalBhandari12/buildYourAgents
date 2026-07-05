import type { Ai } from '@cloudflare/workers-types';

type EmbeddingResponse = {
  data: number[][];
  shape: [number, number];
  pooling: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const BATCH_SIZE = 64;

export async function generateEmbeddings(ai: Ai, texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = (await ai.run(EMBEDDING_MODEL, {
      text: batch,
    })) as EmbeddingResponse;

    results.push(...response.data);
  }

  return results;
}
