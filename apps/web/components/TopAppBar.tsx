'use client';

import { useQuery } from '@tanstack/react-query';
import { getMetrics } from '@/lib/api';

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function usagePct(remaining: number, used: number): number {
  const total = remaining + used;
  return total === 0 ? 0 : Math.min(100, Math.max(0, (remaining / total) * 100));
}

function usageTextColor(pct: number): string {
  if (pct <= 10) return 'text-red-700';
  if (pct <= 30) return 'text-amber-700';
  return 'text-gray-1000';
}

function usageBarColor(pct: number): string {
  if (pct <= 10) return 'bg-red-700';
  if (pct <= 30) return 'bg-amber-700';
  return 'bg-blue-900';
}

type Session = { user: { name: string } };

function StatChip({ label, remaining, used }: { label: string; remaining: number; used: number }) {
  const pct = usagePct(remaining, used);
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-label-12 uppercase tracking-wider text-gray-1000 font-bold">
        {label}
      </span>
      <div className={`flex items-baseline gap-0.5 ${usageTextColor(pct)}`}>
        <span className="text-label-14-mono font-semibold">{formatCompact(remaining)}</span>
        <span className="text-label-12-mono text-gray-1000">
          /{formatCompact(remaining + used)}
        </span>
      </div>
      <div className="w-14 h-1 rounded-full bg-gray-alpha-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${usageBarColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TopAppBar({ session }: { session: Session | null }) {
  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
    enabled: !!session,
  });

  return (
    <header className="bg-background-100 fixed top-0 w-full z-50 border-b border-gray-alpha-300 flex justify-between items-center px-4 md:px-6 h-16">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-gray-1000">dataset</span>
        <span className="text-heading-16 text-gray-1000">RAGFlow</span>
      </div>

      {metrics && (
        <div className="hidden md:flex items-center gap-5">
          <StatChip
            label="Chunks"
            remaining={metrics.chunksRemaining}
            used={metrics.chunksGenerated}
          />
          <StatChip
            label="Query"
            remaining={metrics.queriesRemaining}
            used={metrics.queriesExecuted}
          />
          <StatChip label="Tokens" remaining={metrics.tokensRemaining} used={metrics.tokensUsed} />
        </div>
      )}
    </header>
  );
}
