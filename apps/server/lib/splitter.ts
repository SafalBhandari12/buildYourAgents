import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';

export interface ChunkMetadata {
  source: string;
  documentTitle: string | null;

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

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 200,

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
): Promise<Document<ChunkMetadata>[]> {
  const sections = parseMarkdown(markdown);
  console.log('Sections:', sections.length);
  console.log('Sections:', JSON.stringify(sections, null, 2));

  const documentTitle = sections.length > 0 ? sections[0].headers[0] : null;

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

      const dataString = `${source}:${headerPath}:${i}`;

      const msgUint8 = new TextEncoder().encode(dataString);

      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const chunkId = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      docs.push(
        new Document({
          pageContent,

          metadata: {
            source,

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
