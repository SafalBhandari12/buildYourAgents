import Link from 'next/link';
import { AuthRedirect } from '@/components/landing/AuthRedirect';

const PIPELINE = [
  { icon: 'dataset', label: 'Knowledge Base' },
  { icon: 'tune', label: 'Agent Settings' },
  { icon: 'key', label: 'Model Key' },
  { icon: 'forum', label: 'Chat' },
];

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: 'dataset',
    title: 'Knowledge base ingestion',
    body: 'Upload PDFs or crawl URLs. Documents are parsed, chunked, and embedded automatically so your agent can retrieve exactly the right context.',
  },
  {
    icon: 'hub',
    title: 'Visual workflow canvas',
    body: 'Wire your Knowledge Base, Agent Settings, and Model Key together on a drag-and-drop node canvas — see the whole pipeline at a glance.',
  },
  {
    icon: 'key',
    title: 'Bring your own LLM keys',
    body: 'Use the platform key to get started free, or plug in your own OpenAI, Claude, Gemini, DeepSeek, or Groq key with automatic fallback ordering.',
  },
  {
    icon: 'tune',
    title: 'Tunable agent settings',
    body: 'Control system prompt, temperature, and input/output token limits so responses match exactly how your agent should behave.',
  },
  {
    icon: 'forum',
    title: 'Live chat playground',
    body: 'Test your configured agent in a real conversation before you ship it, with retrieval context pulled straight from your knowledge base.',
  },
  {
    icon: 'api',
    title: 'Programmatic API access',
    body: 'Generate an API key and call your agent from cURL, Python, or TypeScript — the same chat pipeline you tested in the playground.',
  },
];

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: 'upload_file',
    title: 'Ingest',
    body: 'Upload documents or crawl a URL — Sabai chunks and embeds the content into your personal knowledge base.',
  },
  {
    icon: 'hub',
    title: 'Configure',
    body: 'Wire up the workflow canvas: pick your model key, set the system prompt, and tune retrieval and generation.',
  },
  {
    icon: 'rocket_launch',
    title: 'Ship',
    body: 'Test live in the chat playground, then call the same agent from your own app via a simple API key.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthRedirect />
      <header className="fixed top-0 w-full z-50 border-b border-gray-alpha-300 bg-background-100/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 h-16">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-1000">dataset</span>
            <span className="text-heading-16 text-gray-1000">Sabai</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/signin" className="btn-tertiary h-9 px-4 flex items-center">
              Sign In
            </Link>
            <Link href="/signup" className="btn-primary h-9 px-4 flex items-center">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero */}
        <section className="max-w-3xl mx-auto text-center px-6 pt-40 pb-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-alpha-200 px-3 py-1 text-label-13 text-gray-900 mb-6">
            <span className="material-symbols-outlined text-sm">bolt</span>
            Bring your own LLM · RAG-powered
          </span>
          <h1 className="text-heading-40 md:text-heading-56 text-gray-1000 mb-6 text-balance">
            Build your own AI agent, grounded in your own documents
          </h1>
          <p className="text-copy-18 text-gray-900 max-w-xl mx-auto mb-8">
            Upload documents or crawl URLs into a knowledge base, wire up a retrieval-augmented
            agent on a visual canvas, and chat or integrate it via API — all with your own LLM
            provider keys.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary h-11 px-6 flex items-center text-button-16">
              Get Started — it&rsquo;s free
            </Link>
            <Link
              href="#features"
              className="btn-secondary h-11 px-6 flex items-center text-button-16"
            >
              See how it works
            </Link>
          </div>
        </section>

        {/* Pipeline preview */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="rounded-lg border border-gray-alpha-300 bg-gray-100 p-6 md:p-10 shadow-raised">
            <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-3 md:gap-4">
              {PIPELINE.map((node, i) => (
                <div key={node.label} className="flex items-center gap-3 md:gap-4">
                  <div className="flex flex-col items-center gap-2 rounded-md border border-gray-alpha-400 bg-background-100 px-5 py-4 min-w-[128px]">
                    <span className="material-symbols-outlined text-blue-900">{node.icon}</span>
                    <span className="text-label-13 text-gray-1000 whitespace-nowrap">
                      {node.label}
                    </span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <span className="material-symbols-outlined text-gray-600">arrow_forward</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 pb-24 scroll-mt-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-heading-32 text-gray-1000 mb-3">Everything to build one agent</h2>
            <p className="text-copy-16 text-gray-900">
              Not a suite of products bolted together — one focused pipeline from raw documents to a
              working, integrable agent.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-md border border-gray-alpha-300 bg-gray-100 p-6 flex flex-col gap-3"
              >
                <span className="material-symbols-outlined text-blue-900 text-2xl">{f.icon}</span>
                <h3 className="text-heading-16 text-gray-1000">{f.title}</h3>
                <p className="text-copy-14 text-gray-900">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-alpha-200 text-label-13 text-gray-1000 font-semibold">
                    {i + 1}
                  </span>
                  <span className="material-symbols-outlined text-gray-1000">{s.icon}</span>
                </div>
                <h3 className="text-heading-16 text-gray-1000">{s.title}</h3>
                <p className="text-copy-14 text-gray-900">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="max-w-4xl mx-auto px-6 pb-28">
          <div className="rounded-lg bg-gray-100 border border-gray-alpha-300 px-8 py-14 text-center flex flex-col items-center gap-5">
            <h2 className="text-heading-32 text-gray-1000">Ready to build your agent?</h2>
            <p className="text-copy-16 text-gray-900 max-w-md">
              Create a free account and go from a blank knowledge base to a working agent in
              minutes.
            </p>
            <Link href="/signup" className="btn-primary h-11 px-6 flex items-center text-button-16">
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-alpha-300">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-600 text-lg">dataset</span>
            <span className="text-copy-13 text-gray-700">Sabai — Build Your Agents</span>
          </div>
          <span className="text-copy-13 text-gray-700">© 2026 Sabai</span>
        </div>
      </footer>
    </div>
  );
}
