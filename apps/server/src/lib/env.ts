import { Ai, VectorizeIndex, D1Database, RateLimit } from '@cloudflare/workers-types';
import { User } from '../db/auth-schema';

export type openAiEnv = {
  Bindings: {
    OPENAI_API_KEY: string;
    AZURE_BASE_URl: string;
  };
};

export type cloudflareAiEnv = {
  Bindings: {
    AI: Ai;
    VECTORIZE: VectorizeIndex;
  };
};

export type chatEnv = {
  Bindings: openAiEnv['Bindings'] &
    cloudflareAiEnv['Bindings'] &
    huggingfaceEnv['Bindings'] &
    DBEnv['Bindings'] &
    llmKeyEnv['Bindings'];
  Variables: {
    user: User;
  };
};

export type llmKeyEnv = {
  Bindings: {
    LLM_KEY_ENCRYPTION_SECRET: string;
  };
};

export type huggingfaceEnv = {
  Bindings: {
    HUGGINGFACE_API_KEY: string;
  };
};

export type DBEnv = {
  Bindings: {
    DB: D1Database;
  };
};

export type maileriooEnv = {
  Bindings: {
    MAILEROO_API_KEY: string;
    MAIL_FROM_EMAIL: string;
  };
};

export type firecrawlEnv = {
  Bindings: {
    FIRECRAWL_API_KEY: string;
  };
};

export type BetterAuthEnv = DBEnv &
  maileriooEnv & {
    Bindings: {
      BETTER_AUTH_SECRET: string;
      BETTER_AUTH_URL: string;
      FRONTEND_URL: string;
    };
    Variables: {
      user: User;
    };
  };

export type RateLimitEnv = {
  Bindings: {
    GENERAL_RATE_LIMIT: RateLimit;
  };
};
