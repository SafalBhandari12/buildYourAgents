import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import type { ChunkingStrategy } from '../schema';

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  strategy: ChunkingStrategy;
}

export interface ChunkMetadata {
  source: string;
  documentTitle: string | null;
  userId: string;

  h1: string | null;
  h2: string | null;
  h3: string | null;
  h4: string | null;
  h5: string | null;
  h6: string | null;

  title: string | null;
  headerPath: string;

  chunkIndex: number;
  totalChunks: number;

  chunkId: string;
}

interface Section {
  headers: (string | null)[];
  content: string;
}

function buildSplitter(chunkSize: number, chunkOverlap: number) {
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,

    separators: [
      '\n###### ',
      '\n##### ',
      '\n#### ',
      '\n### ',
      '\n## ',
      '\n\n',
      '\n',
      '. ',
      '! ',
      '? ',
      '; ',
      ', ',
      ' ',
      '',
    ],
  });
}

/**
 * Splits markdown into logical sections using headers.
 */
function parseMarkdown(markdown: string): Section[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  const sections: Section[] = [];

  let headers: (string | null)[] = Array(6).fill(null);
  let buffer: string[] = [];

  function flush() {
    const text = buffer.join('\n').trim();

    if (!text) return;

    sections.push({
      headers: [...headers],
      content: text,
    });

    buffer = [];
  }

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line);

    if (!match) {
      buffer.push(line);
      continue;
    }

    flush();

    const level = match[1].length;
    const title = match[2].trim();

    headers[level - 1] = title;

    // clear deeper levels
    for (let i = level; i < 6; i++) {
      headers[i] = null;
    }
  }

  flush();

  return sections;
}

export async function splitMarkdownDocument(
  markdown: string,
  source: string,
  userId: string,
  options: ChunkingOptions,
  tier?: string,
): Promise<Document<ChunkMetadata>[]> {
  // Header-aware markdown splitting is a paid-tier feature — free tier is silently
  // downgraded to plain recursive splitting regardless of the user's saved preference.
  if (tier === 'free' || options.strategy === 'recursive') {
    return splitSimpleText(markdown, source, userId, options);
  }
  const splitter = buildSplitter(options.chunkSize, options.chunkOverlap);
  const sections = parseMarkdown(markdown);

  const documentTitle =
    sections.length > 0
      ? (() => {
          for (let level = 0; level < 6; level++) {
            for (const section of sections) {
              if (section.headers[level] !== null) {
                return section.headers[level];
              }
            }
          }
          return null;
        })()
      : null;

  const docs: Document<ChunkMetadata>[] = [];

  for (const section of sections) {
    let pieces = await splitter.splitText(section.content);

    // Merge tiny final chunk
    if (pieces.length > 1 && pieces[pieces.length - 1].length < 150) {
      pieces[pieces.length - 2] += '\n\n' + pieces.pop();
    }

    const headerPath = section.headers.filter(Boolean).join(' > ');

    for (let i = 0; i < pieces.length; i++) {
      const body = pieces[i].trim();

      const pageContent = [
        documentTitle ? `Document: ${documentTitle}` : undefined,

        headerPath ? `Section: ${headerPath}` : undefined,

        '---',

        body,
      ]
        .filter(Boolean)
        .join('\n');

      const dataString = `${userId}:${source}:${headerPath}:${i}`;

      const msgUint8 = new TextEncoder().encode(dataString);

      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const chunkId = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      docs.push(
        new Document({
          pageContent,

          metadata: {
            source,
            userId,
            documentTitle,

            h1: section.headers[0],
            h2: section.headers[1],
            h3: section.headers[2],
            h4: section.headers[3],
            h5: section.headers[4],
            h6: section.headers[5],

            title: [...section.headers].reverse().find(Boolean) ?? null,

            headerPath,

            chunkIndex: i,

            totalChunks: pieces.length,

            chunkId,
          },
        }),
      );
    }
  }

  return docs;
}

async function splitSimpleText(
  text: string,
  source: string,
  userId: string,
  options: ChunkingOptions,
): Promise<Document<ChunkMetadata>[]> {
  const splitter = buildSplitter(options.chunkSize, options.chunkOverlap);
  const pieces = await splitter.splitText(text);

  const docs: Document<ChunkMetadata>[] = [];

  for (let i = 0; i < pieces.length; i++) {
    const dataString = `${userId}:${source}:${i}`;
    const msgUint8 = new TextEncoder().encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const chunkId = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    docs.push(
      new Document({
        pageContent: pieces[i].trim(),
        metadata: {
          source,
          userId,
          documentTitle: null,
          h1: null,
          h2: null,
          h3: null,
          h4: null,
          h5: null,
          h6: null,
          title: null,
          headerPath: 'Direct',
          chunkIndex: i,
          totalChunks: pieces.length,
          chunkId,
        },
      }),
    );
  }

  return docs;
}
