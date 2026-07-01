import OpenAI from 'openai';
import LlamaCloud from '@llamaindex/llama-cloud';
import { Ai, VectorizeIndex } from '@cloudflare/workers-types';

export type llamaParseEnv = {
  Bindings: {
    LLAMAPARSE_API_KEY: string;
  };
  Variables: {
    llamaParse: LlamaCloud;
  };
};

export type openAiEnv = {
  Bindings: {
    OPENAI_API_KEY: string;
    AZURE_BASE_URl: string;
  };
  Variables: {
    openai: OpenAI;
  };
};

export type cloudflareAiEnv = {
  Bindings: {
    AI: Ai;
    VECTORIZE: VectorizeIndex;
  };
};

export type chatEnv = {
  Bindings: openAiEnv['Bindings'] & cloudflareAiEnv['Bindings'] & huggingfaceEnv['Bindings'];
  Variables: openAiEnv['Variables'];
};

export type huggingfaceEnv = {
  Bindings: {
    HUGGINGFACE_API_KEY: string;
  };
};

export type AppEnv = {
  Bindings: llamaParseEnv['Bindings'] &
    openAiEnv['Bindings'] &
    cloudflareAiEnv['Bindings'] &
    huggingfaceEnv['Bindings'];
  Variables: llamaParseEnv['Variables'] & openAiEnv['Variables'];
};
