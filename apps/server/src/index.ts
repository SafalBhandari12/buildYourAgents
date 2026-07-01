import { Env, Hono } from 'hono'
import { streamText } from 'hono/streaming'
import { openaiMiddleware } from '../lib/gpt'
import { chatInputSchema } from './schema'
import { llammaParseMiddleware } from '../lib/lammaParse'
import { asyncHandler, globalErrorHandler } from '../lib/errorHandler'
import { BadRequestError } from '../lib/errors'
import { AppEnv, llamaParseEnv, openAiEnv } from '../lib/env'

const app = new Hono<Env>()

// Register the global error handler for the app
app.onError(globalErrorHandler)

app.post("/ingest", llammaParseMiddleware, asyncHandler<llamaParseEnv>(async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    throw new BadRequestError("Missing file: Please upload a valid file");
  }
  
  const llamaParse = c.get("llamaParse")
  const extractedText = await llamaParse.parsing.create({
    tier: "cost_effective",
    upload_file: file,
    version: "latest"
  })
  
  return c.json({ msg: "Hello world!!", extractedText })
}))

app.post('/chat', openaiMiddleware, asyncHandler<openAiEnv>(async (c) => {
  const body = await c.req.json();
  const { message } = await chatInputSchema.parseAsync(body);

  const ai = c.get("openai")

  return streamText(c, async (streamWriter) => {
    const llmResponse = await ai.responses.create({
      model: "gpt-5.4-mini",
      input: message,
      stream: true
    })

    for await (const event of llmResponse) {
      if (event.type === 'response.output_text.delta') {
        await streamWriter.write(event.delta)
      }
    }
  })
}))

export default app


