"use client";

import { createContext, ReactNode, useState, useEffect, useMemo } from "react";

// Stream context for handling streaming responses
export const Context = createContext<{
  streamPromise?: Promise<ReadableStream>;
  setStreamPromise: (v: Promise<ReadableStream> | undefined) => void;
}>({
  setStreamPromise: () => {},
});

// Auth context for user authentication state
interface UserProfile {
  name: string | null;
  email: string | null;
  image: string | null;
  tier: string;
}

interface AuthState {
  authenticated: boolean;
  profile?: UserProfile;
  balance?: { balance: number };
  loading: boolean;
}

export const AuthContext = createContext<AuthState>({
  authenticated: false,
  loading: true,
});

export default function Providers({ children }: { children: ReactNode }) {
  const [streamPromise, setStreamPromise] = useState<Promise<ReadableStream>>();
  const [authState, setAuthState] = useState<AuthState>({
    authenticated: false,
    loading: true,
  });

  useEffect(() => {
    // Fetch auth status on mount
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        setAuthState({
          authenticated: data.authenticated,
          profile: data.profile,
          balance: data.balance,
          loading: false,
        });
      })
      .catch((err) => {
        console.error("Failed to fetch auth status:", err);
        setAuthState({ authenticated: false, loading: false });
      });
  }, []);

  // Memoize context values to prevent unnecessary re-renders
  const streamContextValue = useMemo(
    () => ({ streamPromise, setStreamPromise }),
    [streamPromise]
  );

  return (
    <AuthContext value={authState}>
      <Context value={streamContextValue}>
        {children}
      </Context>
    </AuthContext>
  );
}
