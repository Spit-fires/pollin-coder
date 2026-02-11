"use client";

import { createContext, ReactNode, useState, useEffect, useMemo } from "react";
import { getApiKey } from "@/lib/secure-storage";
import { useRouter } from "next/navigation";
import { z } from "zod";

// Schema for validating profile data from localStorage
const profileSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  tier: z.string().default("free"),
}).passthrough();

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
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for API key
    const apiKey = getApiKey();
    
    if (!apiKey) {
      // No API key found - redirect to login
      setAuthState({ authenticated: false, loading: false });
      router.push("/login");
      return;
    }

    // Load and validate profile from localStorage
    try {
      const profileStr = localStorage.getItem('pollinations_profile');
      const rawProfile = profileStr ? JSON.parse(profileStr) : undefined;
      const profile = rawProfile ? profileSchema.safeParse(rawProfile) : undefined;
      
      setAuthState({
        authenticated: true,
        profile: profile?.success ? profile.data as UserProfile : undefined,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to load profile from localStorage:", err);
      setAuthState({ 
        authenticated: true, // Still authenticated if API key exists
        loading: false 
      });
    }
  }, [router]);

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
