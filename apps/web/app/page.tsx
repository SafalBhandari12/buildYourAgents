'use client';

import { useState } from 'react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import { authClient } from '@/lib/auth-client';
import { useMediaQuery } from '@/lib/use-media-query';
import { AuthModalProvider } from '@/components/AuthModalContext';
import { TopAppBar } from '@/components/TopAppBar';
import { WorkflowCanvas } from '@/components/WorkflowCanvas';
import { IntegrationPanel } from '@/components/IntegrationPanel';

function ResizeHandle() {
  return (
    <Separator
      className="relative w-px bg-gray-alpha-300 transition-colors hover:bg-gray-600 active:bg-blue-700
        after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-[''] after:cursor-col-resize"
    />
  );
}

const noopStorage = { getItem: () => null, setItem: () => {} };

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const [metricsVersion, setMetricsVersion] = useState(0);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'dashboard-panels-v3',
    panelIds: ['workflow', 'integration'],
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  });

  const workflow = (
    <WorkflowCanvas
      isAuthenticated={!!session}
      onIngested={() => setMetricsVersion((v) => v + 1)}
      onMessageSent={() => setMetricsVersion((v) => v + 1)}
    />
  );
  const integration = <IntegrationPanel isAuthenticated={!!session} />;

  return (
    <AuthModalProvider>
      <TopAppBar session={session ?? null} refreshKey={metricsVersion} />
      <main className={isDesktop ? 'pt-16 h-[calc(100vh-4rem)]' : 'pt-16'}>
        {isDesktop ? (
          <Group
            orientation="horizontal"
            className="h-full"
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
          >
            <Panel id="workflow" defaultSize={68} minSize={30}>
              {workflow}
            </Panel>
            <ResizeHandle />
            <Panel id="integration" defaultSize={32} minSize={20}>
              {integration}
            </Panel>
          </Group>
        ) : (
          <div className="flex flex-col divide-y divide-gray-alpha-300">
            <div className="h-[70vh] flex-shrink-0">{workflow}</div>
            <div className="h-[70vh] flex-shrink-0">{integration}</div>
          </div>
        )}
      </main>
    </AuthModalProvider>
  );
}
