'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

// Bounces an already-signed-in visitor from the marketing landing page straight into the
// app. Can't be done in middleware: the session cookie is scoped to the API's own origin
// (Workers), not the Next.js app's origin (Vercel), so no server-side check can see it.
export function AuthRedirect() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.replace('/dashboard');
    }
  }, [isPending, session, router]);

  return null;
}
