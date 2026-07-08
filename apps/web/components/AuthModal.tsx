'use client';

import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

type Mode = 'signin' | 'signup';

export function AuthModal({
  initialMode,
  onClose,
  onSuccess,
}: {
  initialMode: Mode;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

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
    onSuccess();
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-[380px] bg-gray-100 rounded-md shadow-modal p-6 flex flex-col gap-4 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-600 hover:text-gray-1000 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {submittedEmail ? (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <span className="material-symbols-outlined text-blue-900 text-3xl">mail</span>
            <h2 className="text-heading-20 text-gray-1000">Check Your Email</h2>
            <p className="text-copy-14 text-gray-900">
              We sent a verification link to <span className="text-gray-1000">{submittedEmail}</span>. Verify
              your address, then sign in below.
            </p>
            <button
              className="btn-secondary h-10 px-4 w-full"
              onClick={() => {
                setSubmittedEmail(null);
                setMode('signin');
              }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-gray-1000 text-3xl">dataset</span>
              <h2 className="text-heading-20 text-gray-1000">
                {mode === 'signin' ? 'Sign In to RAGFlow' : 'Create Your Account'}
              </h2>
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
                  <span className="text-label-14 text-gray-900">Name</span>
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
                <span className="text-label-14 text-gray-900">Email</span>
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
                <span className="text-label-14 text-gray-900">Password</span>
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

              <button type="submit" disabled={isSubmitting} className="btn-primary h-10 mt-2 disabled:opacity-50">
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
                  <button
                    className="text-blue-900 hover:underline"
                    onClick={() => {
                      setError(null);
                      setMode('signup');
                    }}
                  >
                    Create One
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    className="text-blue-900 hover:underline"
                    onClick={() => {
                      setError(null);
                      setMode('signin');
                    }}
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
