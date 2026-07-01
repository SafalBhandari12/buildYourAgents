import { Env, Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { openaiMiddleware } from '../lib/gpt';
import { chatInputSchema } from './schema';
import { llammaParseMiddleware } from '../lib/lammaParse';
import { asyncHandler, globalErrorHandler } from '../lib/errorHandler';
import { BadRequestError } from '../lib/errors';
import { AppEnv, llamaParseEnv, openAiEnv } from '../lib/env';
import { splitMarkdownDocument } from '../lib/splitter';

const app = new Hono<Env>();

// Register the global error handler for the app
app.onError(globalErrorHandler);

app.post(
  '/ingest',
  llammaParseMiddleware,
  asyncHandler<llamaParseEnv>(async (c) => {
    const form = await c.req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      throw new BadRequestError('Missing file: Please upload a valid file');
    }

    const llamaParse = c.get('llamaParse');

    const start = Date.now();

    const fileObj = await llamaParse.files.create({
      file,
      purpose: 'parse',
    });

    console.log('File uploaded in', Date.now() - start, 'ms');

    const result = await llamaParse.parsing.parse({
      file_id: fileObj.id,
      tier: 'cost_effective',
      expand: ['markdown_full'],
      version: '2026-06-26',
    });
    console.log('File parsed in', Date.now() - start, 'ms');

    if (result.markdown_full === undefined || result.markdown_full === null) {
      throw new BadRequestError('Parsing failed: No markdown content returned');
    }

    const chunks = await splitMarkdownDocument(result.markdown_full, file.name);
    console.log('File split into chunks:', chunks.length);
    console.log('File split into chunks in', Date.now() - start, 'ms');
    console.log('Chunks', JSON.stringify(chunks, null, 2));

    return c.json({ msg: 'Hello world!!', result: result.markdown_full });
  }),
);

app.post(
  '/chat',
  openaiMiddleware,
  asyncHandler<openAiEnv>(async (c) => {
    const body = await c.req.json();
    const { message } = await chatInputSchema.parseAsync(body);

    const ai = c.get('openai');

    return streamText(c, async (streamWriter) => {
      const llmResponse = await ai.responses.create({
        model: 'gpt-5.4-mini',
        input: message,
        stream: true,
      });

      for await (const event of llmResponse) {
        if (event.type === 'response.output_text.delta') {
          await streamWriter.write(event.delta);
        }
      }
    });
  }),
);

export default app;
