'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { PageId } from '@/components/Sidebar';

type TourStep = {
  pageId: PageId;
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    pageId: 'playground',
    title: 'Playground',
    body: 'Your workspace — wire a Knowledge Base, Agent Settings, and Model Key together on a visual canvas, then chat with the result.',
  },
  {
    pageId: 'integrations',
    title: 'Integrations',
    body: 'Manage which LLM providers power your agent — bring your own key, or use the shared platform default.',
  },
  {
    pageId: 'api-keys',
    title: 'API Keys',
    body: 'Generate a key here to call your agent from your own code — cURL, Python, or TypeScript.',
  },
  {
    pageId: 'chat-history',
    title: 'Chat History',
    body: 'Every conversation is logged here so you can revisit past answers and their sources.',
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function measure(pageId: PageId): Rect | null {
  const el = document.querySelector(`[data-tour-id="${pageId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function NavTour({
  orientation,
  onStepChange,
  onFinish,
}: {
  orientation: 'vertical' | 'horizontal';
  onStepChange: (pageId: PageId) => void;
  onFinish: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = STEPS[stepIndex];

  // Sync the parent's activePage in the same click handler that advances stepIndex, so
  // both updates land in the same React batch/render — a separate effect keyed on
  // stepIndex would fire a tick after this component's own tooltip already re-rendered,
  // leaving the sidebar highlight and page content visibly one step behind the tooltip.
  function goToStep(index: number) {
    setStepIndex(index);
    const next = STEPS[index];
    if (next) onStepChange(next.pageId);
  }

  useEffect(() => {
    onStepChange(STEPS[0]!.pageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!step) return;
    const update = () => setRect(measure(step.pageId));
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [step]);

  if (!step) return null;

  const isLast = stepIndex === STEPS.length - 1;

  const tooltipStyle: CSSProperties = rect
    ? orientation === 'vertical'
      ? { top: rect.top, left: rect.left + rect.width + 16 }
      : { top: rect.top + rect.height + 12, left: Math.max(16, rect.left) }
    : { top: 80, left: 80 };

  return (
    <div className="fixed inset-0 z-[100]">
      {rect && (
        <div
          className="fixed rounded-md transition-all duration-200 pointer-events-none"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
          }}
        />
      )}

      <div
        className="fixed w-full max-w-[300px] bg-gray-100 rounded-md shadow-modal p-4 flex flex-col gap-3"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between">
          <span className="text-label-12 text-gray-600">
            {stepIndex + 1} / {STEPS.length}
          </span>
          <button
            onClick={onFinish}
            className="text-copy-13 text-gray-600 hover:text-gray-1000 transition-colors"
          >
            Skip tour
          </button>
        </div>
        <div>
          <h3 className="text-heading-14 text-gray-1000 mb-1">{step.title}</h3>
          <p className="text-copy-13 text-gray-900">{step.body}</p>
        </div>
        <div className="flex justify-between gap-2">
          <button
            className="btn-secondary px-3 h-8 disabled:opacity-30"
            disabled={stepIndex === 0}
            onClick={() => goToStep(Math.max(0, stepIndex - 1))}
          >
            Back
          </button>
          <button
            className="btn-primary px-3 h-8"
            onClick={() => (isLast ? onFinish() : goToStep(stepIndex + 1))}
          >
            {isLast ? 'Start building' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
