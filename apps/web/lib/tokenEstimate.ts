// Simple character-count heuristic for estimating input size without depending on a real
// tokenizer library — ~4 characters per token is the standard rough approximation. Mirrors
// the same constant on the backend (apps/server/src/schema.ts).
export const MAX_INPUT_TOKENS = 1000;
const CHARS_PER_TOKEN = 4;

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
