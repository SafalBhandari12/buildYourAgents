'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type Mode = 'signin' | 'signup';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Already signed in (e.g. arrived here via a stale bookmark) — bounce straight to the app.
  useEffect(() => {
    if (!sessionPending && session) {
      router.replace(callbackUrl);
    }
  }, [sessionPending, session, callbackUrl, router]);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error } = await authClient.signIn.email({ email, password });
    setIsSubmitting(false);
    if (error) {
      setError(error.message ?? 'Sign in failed. Check your credentials and try again.');
      return;
    }
    router.push(callbackUrl);
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setIsSubmitting(false);
    if (error) {
      setError(error.message ?? 'Sign up failed. Try a different email or a stronger password.');
      return;
    }
    setSubmittedEmail(email);
  }

  if (sessionPending || session) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined text-gray-600 text-3xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (submittedEmail) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-blue-900 text-3xl">mail</span>
        <h1 className="text-heading-24 text-gray-1000">Check Your Email</h1>
        <p className="text-copy-14 text-gray-900">
          We sent a verification link to <span className="text-gray-1000">{submittedEmail}</span>.
          Verify your address, then sign in below.
        </p>
        <Link
          href="/signin"
          className="btn-secondary h-10 px-4 w-full flex items-center justify-center"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-24 text-gray-1000">
          {mode === 'signin' ? 'Sign in to Sabai' : 'Create your account'}
        </h1>
        <p className="text-copy-14 text-gray-900">
          {mode === 'signin'
            ? 'Welcome back — pick up where you left off.'
            : 'Start building a personal RAG-powered agent, free.'}
        </p>
      </div>

      <form
        onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}
        className="flex flex-col gap-4"
      >
        {error && (
          <div className="text-copy-13 text-red-900 bg-red-100 border border-red-400 rounded-sm px-3 py-2">
            {error}
          </div>
        )}

        {mode === 'signup' && (
          <label className="flex flex-col gap-1">
            <span className="text-label-14 text-gray-1000">Name</span>
            <input
              className="input-field"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Pearson"
            />
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-label-14 text-gray-1000">Email</span>
          <input
            className="input-field"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-label-14 text-gray-1000">Password</span>
          <input
            className="input-field"
            type="password"
            required
            minLength={mode === 'signup' ? 8 : undefined}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary h-10 mt-2 disabled:opacity-50"
        >
          {isSubmitting
            ? mode === 'signin'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
        </button>
      </form>

      <p className="text-copy-14 text-gray-900 text-center">
        {mode === 'signin' ? (
          <>
            Don&rsquo;t have an account?{' '}
            <Link href="/signup" className="text-blue-900 hover:underline">
              Create One
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/signin" className="text-blue-900 hover:underline">
              Sign In
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
