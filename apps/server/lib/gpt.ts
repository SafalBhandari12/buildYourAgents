import OpenAI from "openai";
import { createMiddleware } from "hono/factory";
import { openAiEnv } from "./env";


export const openaiMiddleware = createMiddleware<openAiEnv>(async (c, next) => {
  c.set(
    "openai",
    new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
      baseURL:c.env.AZURE_BASE_URl
    })
  );

  await next();
});
