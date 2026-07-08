'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useMediaQuery } from '@/lib/use-media-query';
import { AuthModalProvider } from '@/components/AuthModalContext';
import { TopAppBar } from '@/components/TopAppBar';
import { Sidebar, type PageId } from '@/components/Sidebar';
import { WorkflowCanvas } from '@/components/WorkflowCanvas';
import { IntegrationsPage } from '@/components/IntegrationsPage';
import { ApiKeysPage } from '@/components/ApiKeysPage';
import { ChatHistoryPage } from '@/components/ChatHistoryPage';

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const [activePage, setActivePage] = useState<PageId>('playground');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const pageContent =
    activePage === 'playground' ? (
      <WorkflowCanvas isAuthenticated={!!session} />
    ) : activePage === 'integrations' ? (
      <IntegrationsPage isAuthenticated={!!session} />
    ) : activePage === 'api-keys' ? (
      <ApiKeysPage isAuthenticated={!!session} />
    ) : (
      <ChatHistoryPage isAuthenticated={!!session} />
    );

  return (
    <AuthModalProvider>
      <TopAppBar session={session ?? null} />
      <main className={`pt-16 h-screen flex overflow-hidden ${isDesktop ? 'flex-row' : 'flex-col'}`}>
        <Sidebar
          orientation={isDesktop ? 'vertical' : 'horizontal'}
          active={activePage}
          onSelect={setActivePage}
          session={session ?? null}
        />
        <div className="flex-grow min-w-0 min-h-0 overflow-hidden">{pageContent}</div>
      </main>
    </AuthModalProvider>
  );
}
