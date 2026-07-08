import { LlamaCloud } from '@llamaindex/llama-cloud';

export async function parseFile(file: File, apiKey: string): Promise<string> {
  const client = new LlamaCloud({ apiKey });

  const fileObj = await client.files.create({
    file,
    purpose: 'parse',
  });

  const result = await client.parsing.parse({
    file_id: fileObj.id,
    tier: 'cost_effective',
    version: 'latest',
    expand: ['markdown_full'],
  });

  return result.markdown_full ?? '';
}
