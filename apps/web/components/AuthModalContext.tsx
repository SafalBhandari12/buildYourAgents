'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { AuthModal } from './AuthModal';

type AuthModalMode = 'signin' | 'signup';

type AuthModalContextValue = {
  open: (mode?: AuthModalMode) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>('signin');

  const value = useMemo(
    () => ({
      open: (initialMode: AuthModalMode = 'signin') => {
        setMode(initialMode);
        setIsOpen(true);
      },
    }),
    [],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {isOpen && (
        <AuthModal
          initialMode={mode}
          onClose={() => setIsOpen(false)}
          onSuccess={() => setIsOpen(false)}
        />
      )}
    </AuthModalContext.Provider>
  );
}
