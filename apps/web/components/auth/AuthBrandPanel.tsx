const POINTS: { icon: string; text: string }[] = [
  { icon: 'dataset', text: 'Ingest documents or crawl URLs into your own knowledge base' },
  { icon: 'hub', text: 'Wire up retrieval, prompts, and models on a visual canvas' },
  { icon: 'key', text: 'Bring your own LLM keys, or use the shared platform key to start' },
];

export function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-center gap-8 w-1/2 bg-gray-100 border-r border-gray-alpha-300 px-16">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-gray-1000 text-2xl">dataset</span>
        <span className="text-heading-20 text-gray-1000">Sabai</span>
      </div>
      <h2 className="text-heading-32 text-gray-1000 max-w-md text-balance">
        Build a personal RAG-powered AI agent
      </h2>
      <ul className="flex flex-col gap-4 max-w-md">
        {POINTS.map((p) => (
          <li key={p.text} className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-900 mt-0.5">{p.icon}</span>
            <span className="text-copy-14 text-gray-900">{p.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
