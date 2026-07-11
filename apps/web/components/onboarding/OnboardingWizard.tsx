'use client';

import { useState } from 'react';
import { KnowledgeBasePanel } from '@/components/KnowledgeBasePanel';
import { ModelKeysPanel } from '@/components/ModelKeysPanel';
import { AgentSettingsPanel } from '@/components/AgentSettingsPanel';
import { ChatPanel } from '@/components/ChatPanel';

const STEP_META: { icon: string; title: string; subtitle: string }[] = [
  {
    icon: 'dataset',
    title: 'Add your first document',
    subtitle: 'Upload a file or paste a URL — Sabai chunks and embeds it into your knowledge base.',
  },
  {
    icon: 'key',
    title: 'Bring your own LLM key?',
    subtitle: 'Optional — skip to keep using the shared platform key.',
  },
  {
    icon: 'tune',
    title: 'Configure your agent',
    subtitle: 'Set the system prompt, temperature, and token limits.',
  },
  {
    icon: 'forum',
    title: 'Try it out',
    subtitle: 'Ask your agent a question using what you just configured.',
  },
];

const LAST_STEP = STEP_META.length - 1;

export function OnboardingWizard({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const [hasOwnKey, setHasOwnKey] = useState<boolean | null>(null);

  const meta = STEP_META[step]!;
  const isLast = step === LAST_STEP;

  function next() {
    if (isLast) onFinish();
    else setStep((s) => s + 1);
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }
  function skipOwnKey() {
    setHasOwnKey(false);
    next();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl h-[min(85vh,720px)] bg-gray-100 rounded-md shadow-modal flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-alpha-200 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-gray-1000 text-lg flex-shrink-0">
              {meta.icon}
            </span>
            <div className="min-w-0">
              <h2 className="text-heading-14 text-gray-1000">{meta.title}</h2>
              <p className="text-copy-13 text-gray-900 truncate">{meta.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onFinish}
            className="text-gray-1000 hover:text-gray-1000 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex-grow min-h-0 flex flex-col">
          {step === 0 && <KnowledgeBasePanel isAuthenticated={true} />}

          {step === 1 &&
            (hasOwnKey === null ? (
              <div className="flex-grow flex flex-col items-center justify-center gap-4 text-center px-6">
                <p className="text-copy-14 text-gray-1000 max-w-sm">
                  Do you have your own API key for an LLM provider (OpenAI, Claude, Gemini,
                  DeepSeek, or Groq)?
                </p>
                <div className="flex gap-2">
                  <button className="btn-secondary px-4 h-9" onClick={skipOwnKey}>
                    No, use the platform key
                  </button>
                  <button className="btn-primary px-4 h-9" onClick={() => setHasOwnKey(true)}>
                    Yes, I have one
                  </button>
                </div>
              </div>
            ) : (
              <ModelKeysPanel isAuthenticated={true} />
            ))}

          {step === 2 && <AgentSettingsPanel isAuthenticated={true} />}
          {step === 3 && <ChatPanel isAuthenticated={true} />}
        </div>

        <div className="px-4 py-3 border-t border-gray-alpha-200 flex items-center justify-between flex-shrink-0">
          <div className="flex gap-1.5">
            {STEP_META.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-gray-1000' : 'bg-gray-alpha-400'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary px-3 h-9 disabled:opacity-30"
              disabled={step === 0}
              onClick={back}
            >
              Back
            </button>
            <button className="btn-primary px-3 h-9" onClick={next}>
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
