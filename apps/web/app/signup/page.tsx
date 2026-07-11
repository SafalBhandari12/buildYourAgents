import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Create Account — Sabai' };

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel />
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
            <span className="material-symbols-outlined text-gray-1000">dataset</span>
            <span className="text-heading-16 text-gray-1000">Sabai</span>
          </Link>
          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
