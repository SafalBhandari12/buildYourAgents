# Sabai — Build Your Agents

Sabai (working name **BuildYourAgents**) is a platform for building a personal
RAG-powered AI agent: upload documents or crawl URLs into a knowledge base,
chat against that context using your own LLM provider keys (or the platform's
shared key), and configure the whole pipeline — chunking, retrieval, model
chain order, system prompt — from a visual, node-based canvas.

## Monorepo layout

This is a [Turborepo](https://turborepo.dev) managed with `pnpm` workspaces.

```
apps/
  web/       Next.js 16 app — dashboard, workflow canvas, chat playground
  server/    Hono API running on Cloudflare Workers, backed by D1 (SQLite)
  docs/      Next.js docs site
packages/
  ui/                  Shared React component library
  eslint-config/       Shared ESLint config
  typescript-config/   Shared tsconfig presets
```

### `apps/server` — the API

A [Hono](https://hono.dev) app deployed as a Cloudflare Worker (see
`wrangler.jsonc`), using D1 for storage and Drizzle ORM for schema/migrations.

Routes (mounted under `/api/v1`, see `src/routes/index.ts`):

| Route                 | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------- |
| `/auth`                | Session auth via [better-auth](https://better-auth.com)            |
| `/ingest` (root)       | Upload a file or crawl a URL into the knowledge base                |
| `/chat` (root)         | Streaming RAG chat completion                                       |
| `/documents`           | List/delete ingested documents                                      |
| `/knowledge-settings`  | Chunk size/overlap configuration                                    |
| `/agent-settings`      | System prompt, temperature, token limits                            |
| `/llm-keys`            | Bring-your-own LLM provider keys (OpenAI, Claude, Gemini, Groq...)   |
| `/api-keys`            | Programmatic API key management                                     |
| `/chat-history`        | Past conversation log                                                |
| `/metrics`             | Per-user usage/quota tracking                                        |

**Ingestion pipeline** (`/ingest`):

1. PDFs are parsed to markdown via [LlamaCloud](https://cloud.llamaindex.ai)
   (`src/lib/llamaParse.ts`); web URLs are crawled with
   [Firecrawl](https://firecrawl.dev).
2. The markdown is split into header-aware, overlapping chunks
   (`src/lib/splitter.ts`) using `@langchain/textsplitters`, preserving each
   chunk's section breadcrumb (`Document > Section > Subsection`) as metadata.
3. Chunks are embedded and stored in Cloudflare Vectorize
   (`src/lib/vectorizeDocuments.ts`).

**Chat pipeline** (`/chat`):

1. The user's message is embedded and matched against Vectorize
   (`src/lib/search.ts`) to build retrieval context.
2. Requests are routed through a configurable chain of LLM providers
   (`src/lib/llmChain.ts`) — the platform's own key first (with a fixed quota
   and token cap), then the user's own saved keys in their configured order,
   with automatic cooldown on rate limits and fallback to the next provider.
3. Responses are streamed back to the client and logged to chat history.

### `apps/web` — the dashboard

Next.js 16 (App Router, Turbopack) app with:

- A drag-and-drop **workflow canvas** (`@xyflow/react`) for wiring together
  Knowledge Base, Agent Settings, and Model Key nodes.
- A **chat playground** for testing the configured agent live.
- Panels for managing documents, LLM provider keys, API keys, and chat
  history.
- Auth via `better-auth/react`, talking to the server's `/api/v1/auth`
  endpoints.

## Prerequisites

- Node.js >= 18
- [pnpm](https://pnpm.io) 9
- A Cloudflare account (Workers + D1 + Vectorize) for the server
- API keys for the services you want to use: LlamaCloud, Firecrawl, OpenAI
  (or another LLM provider), Cloudflare AI

## Getting started

Install dependencies from the repo root:

```sh
pnpm install
```

### Configure environment variables

**Server** (`apps/server/.dev.vars` for local dev, Wrangler secrets for
deployed environments):

```
LLAMAPARSE_API_KEY=...
FIRECRAWL_API_KEY=...
OPENAI_API_KEY=...
AZURE_BASE_URl=...
LLM_KEY_ENCRYPTION_SECRET=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...
FRONTEND_URL=...
MAILEROO_API_KEY=...
MAIL_FROM_EMAIL=...
```

Also configure D1 and Vectorize bindings in `apps/server/wrangler.jsonc`.

**Web** (`apps/web/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

> In CI/CD, `NEXT_PUBLIC_API_URL` must be set as a GitHub Actions **repository
> variable** (Settings → Secrets and variables → Actions → Variables) pointing
> at the deployed server URL — the Next.js build statically prerenders pages
> that construct auth URLs from it, and an empty value will fail the build.

### Run everything in dev mode

```sh
pnpm dev
```

This runs `apps/server` (`wrangler dev`) and `apps/web`/`apps/docs`
(`next dev`) in parallel via Turborepo.

### Database migrations

From `apps/server`:

```sh
pnpm db:generate           # generate a new migration from schema changes
pnpm db:migrate:local      # apply migrations to the local D1 database
pnpm db:migrate:prod       # apply migrations to the remote/production D1 database
```

## Other useful commands

Run from the repo root (applies to all apps via Turborepo):

```sh
pnpm build          # build all apps
pnpm lint           # lint all apps
pnpm check-types    # typecheck all apps
pnpm format         # format the codebase with Prettier
pnpm format:check   # check formatting without writing
```

## Tech stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, TanStack Query, XYFlow
- **Backend**: Hono, Cloudflare Workers, Cloudflare D1, Cloudflare Vectorize,
  Drizzle ORM
- **Auth**: better-auth
- **AI/RAG**: LlamaCloud (PDF parsing), Firecrawl (web crawling),
  `@langchain/textsplitters` (chunking), OpenAI-compatible chat completions
  (multi-provider: OpenAI, Claude, Gemini, DeepSeek, Groq)
- **Tooling**: Turborepo, pnpm workspaces, TypeScript, ESLint, Prettier
