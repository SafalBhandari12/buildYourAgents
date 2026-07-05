import { Document } from '@langchain/core/documents';
import { ChunkMetadata } from './splitter';
import { cloudflareAiEnv } from './env';
import { generateEmbeddings } from './embeddings';

export async function vectorizeDocuments(
  env: cloudflareAiEnv['Bindings'],
  documents: Document<ChunkMetadata>[],
): Promise<void> {
  const texts = documents.map((doc) => doc.pageContent);
  const embeddings = await generateEmbeddings(env.AI, texts);

  const vectors = documents.map((doc, index) => ({
    id: doc.metadata.chunkId.toString(),
    values: embeddings[index],
    metadata: {
      userId: doc.metadata.userId,
      chunkId: doc.metadata.chunkId,
      source: doc.metadata.source,
      documentTitle: doc.metadata.documentTitle ?? 'unknown',
      pageContent: doc.pageContent,
    },
  }));


  await env.VECTORIZE.upsert(vectors);
}
