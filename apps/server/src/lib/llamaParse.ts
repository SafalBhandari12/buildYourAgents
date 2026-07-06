import { initSync, LiteParse } from '@llamaindex/liteparse-wasm';
import wasmModule from '@llamaindex/liteparse-wasm/liteparse_wasm_bg.wasm';

let initialized = false;

export async function parseFile(file: File): Promise<string> {
  if (!initialized) {
    initSync({ module: wasmModule });
    initialized = true;
  }

  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  const parser = new LiteParse({
    ocrEnabled: false,
    outputFormat: 'markdown',
  });

  const result = await parser.parse(bytes);
  return result.text;
}
