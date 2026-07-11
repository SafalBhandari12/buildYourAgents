'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { submitOnboardingAnswer } from '@/lib/api';

export type OnboardingView = 'question' | 'guide' | 'tips';

// better-auth additionalFields aren't threaded through the client's TS types (same as the
// existing untyped `tier` field), so read them off the session user with a loose cast.
export type OnboardingFields = {
  onboardingAnsweredAt?: string | number | Date | null;
  isNewToAgents?: boolean | null;
};

const GUIDE_SECTIONS: { icon: string; title: string; body: string }[] = [
  {
    icon: 'dataset',
    title: 'Knowledge Base',
    body: 'Upload PDFs or crawl a URL — Sabai parses, chunks, and embeds the content so your agent can retrieve exactly the right passages when it answers.',
  },
  {
    icon: 'tune',
    title: 'Agent Settings',
    body: 'Set the system prompt, temperature, and input/output token limits that control how your agent reasons and responds.',
  },
  {
    icon: 'key',
    title: 'Model Keys',
    body: 'Start free with the shared platform key (a fixed quota), or bring your own OpenAI, Claude, Gemini, DeepSeek, or Groq key — order multiple keys as a fallback chain.',
  },
  {
    icon: 'hub',
    title: 'Workflow Canvas',
    body: 'Wire the Knowledge Base, Agent Settings, and Model Key nodes together visually — this is the pipeline your agent actually runs.',
  },
  {
    icon: 'forum',
    title: 'Chat Playground',
    body: 'Test the exact agent you configured, in a live conversation, before using it anywhere else.',
  },
  {
    icon: 'api',
    title: 'API Keys',
    body: 'Generate a key and call your agent from your own code — cURL, Python, or TypeScript — using the same pipeline you tested in the playground.',
  },
  {
    icon: 'history',
    title: 'Chat History',
    body: 'Every conversation is logged so you can review past answers and which sources they came from.',
  },
];

const QUICK_TIPS: string[] = [
  'Wire nodes on the Playground canvas to configure your agent.',
  'Add a model key under Integrations, or use the free platform key to start.',
  'Test live in the Chat Playground before integrating anywhere else.',
  'Generate an API key to call your agent from your own code.',
  'Usage quotas (chunks, queries, tokens) are shown at the top of the dashboard.',
];

export function OnboardingModal({
  view,
  onClose,
  onAnswered,
}: {
  view: OnboardingView | null;
  onClose: () => void;
  onAnswered: (isNewToAgents: boolean) => void;
}) {
  const [pendingAnswer, setPendingAnswer] = useState<boolean | null>(null);

  const { mutate: answer } = useMutation({
    mutationFn: submitOnboardingAnswer,
    onMutate: (isNewToAgents) => setPendingAnswer(isNewToAgents),
    onSuccess: (_data, isNewToAgents) => onAnswered(isNewToAgents),
    onSettled: () => setPendingAnswer(null),
  });

  if (!view) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-[480px] max-h-[85vh] bg-gray-100 rounded-md shadow-modal p-6 flex flex-col gap-4 relative overflow-hidden">
        {view !== 'question' && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-1000 hover:text-gray-1000 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}

        {view === 'question' && (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <span className="material-symbols-outlined text-blue-900 text-3xl">waving_hand</span>
            <h2 className="text-heading-20 text-gray-1000">Welcome to Sabai</h2>
            <p className="text-copy-14 text-gray-900">
              Is this your first time using an AI agent platform?
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                className="btn-primary h-10 disabled:opacity-50"
                disabled={pendingAnswer !== null}
                onClick={() => answer(true)}
              >
                {pendingAnswer === true ? 'One sec…' : 'Yes, walk me through it'}
              </button>
              <button
                className="btn-secondary h-10 disabled:opacity-50"
                disabled={pendingAnswer !== null}
                onClick={() => answer(false)}
              >
                {pendingAnswer === false ? 'One sec…' : 'No, I know the basics'}
              </button>
            </div>
          </div>
        )}

        {view === 'guide' && (
          <>
            <div className="flex flex-col items-center gap-2 text-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-900 text-3xl">menu_book</span>
              <h2 className="text-heading-20 text-gray-1000">How Sabai works</h2>
              <p className="text-copy-14 text-gray-900">
                A personal RAG-powered agent: ground it in your own documents, configure how it
                thinks, then chat with it or call it from your own code.
              </p>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto pr-1 -mr-1">
              {GUIDE_SECTIONS.map((s) => (
                <div key={s.title} className="flex gap-3">
                  <span className="material-symbols-outlined text-gray-1000 mt-0.5">{s.icon}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-heading-14 text-gray-1000">{s.title}</span>
                    <span className="text-copy-13 text-gray-900">{s.body}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="btn-primary h-10 flex-shrink-0">
              Let&rsquo;s build
            </button>
          </>
        )}

        {view === 'tips' && (
          <>
            <div className="flex flex-col items-center gap-2 text-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-900 text-3xl">bolt</span>
              <h2 className="text-heading-20 text-gray-1000">Quick tips</h2>
            </div>
            <ul className="flex flex-col gap-2.5 overflow-y-auto">
              {QUICK_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-copy-14 text-gray-900">
                  <span className="material-symbols-outlined text-gray-600 text-lg flex-shrink-0">
                    check
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
            <button onClick={onClose} className="btn-primary h-10 flex-shrink-0">
              Start building
            </button>
          </>
        )}
      </div>
    </div>
  );
}
