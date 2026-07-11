'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useMediaQuery } from '@/lib/use-media-query';
import { AuthModalProvider } from '@/components/AuthModalContext';
import { TopAppBar } from '@/components/TopAppBar';
import { Sidebar, type PageId } from '@/components/Sidebar';
import { WorkflowCanvas } from '@/components/WorkflowCanvas';
import { IntegrationsPage } from '@/components/IntegrationsPage';
import { ApiKeysPage } from '@/components/ApiKeysPage';
import { ChatHistoryPage } from '@/components/ChatHistoryPage';
import {
  OnboardingModal,
  type OnboardingFields,
  type OnboardingView,
} from '@/components/onboarding/OnboardingModal';
import { NavTour } from '@/components/onboarding/NavTour';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

type OnboardingStage = OnboardingView | 'tour' | 'wizard' | null;

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [activePage, setActivePage] = useState<PageId>('playground');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [stage, setStage] = useState<OnboardingStage>(null);
  const [onboardingInitialized, setOnboardingInitialized] = useState(false);
  const [isNewToAgents, setIsNewToAgents] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/signin');
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (!session || onboardingInitialized) return;
    setOnboardingInitialized(true);
    const fields = session.user as unknown as OnboardingFields;
    setIsNewToAgents(fields.isNewToAgents ?? null);
    if (!fields.onboardingAnsweredAt) {
      setStage('question');
    }
  }, [session, onboardingInitialized]);

  if (isPending || !session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-gray-600 text-3xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

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
      <TopAppBar
        session={session}
        onOpenGuide={() => setStage(isNewToAgents === false ? 'tips' : 'tour')}
      />
      <main
        className={`pt-16 h-screen flex overflow-hidden ${isDesktop ? 'flex-row' : 'flex-col'}`}
      >
        <Sidebar
          orientation={isDesktop ? 'vertical' : 'horizontal'}
          active={activePage}
          onSelect={setActivePage}
          session={session}
        />
        <div className="flex-grow min-w-0 min-h-0 overflow-hidden">{pageContent}</div>
      </main>

      <OnboardingModal
        view={stage === 'question' || stage === 'tips' ? stage : null}
        onClose={() => setStage(null)}
        onAnswered={(answer) => {
          setIsNewToAgents(answer);
          setStage(answer ? 'tour' : 'tips');
        }}
      />

      {stage === 'tour' && (
        <NavTour
          orientation={isDesktop ? 'vertical' : 'horizontal'}
          onStepChange={setActivePage}
          onFinish={() => setStage('wizard')}
        />
      )}

      {stage === 'wizard' && <OnboardingWizard onFinish={() => setStage(null)} />}
    </AuthModalProvider>
  );
}
