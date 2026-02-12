import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from "react";
import {
  type Model,
  FALLBACK_MODELS,
  DEFAULT_MODEL_FALLBACK,
} from "@/lib/constants";

const PREFERRED_MODEL_KEY = "preferred-model";

/**
 * Get the user's preferred model from localStorage
 * Falls back to DEFAULT_MODEL_FALLBACK if not set
 */
export function getDefaultModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL_FALLBACK;

  try {
    const stored = localStorage.getItem(PREFERRED_MODEL_KEY);
    return stored || DEFAULT_MODEL_FALLBACK;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return DEFAULT_MODEL_FALLBACK;
  }
}

/**
 * Save the user's preferred model to localStorage
 */
export function setDefaultModel(model: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PREFERRED_MODEL_KEY, model);
  } catch (error) {
    console.error("Error writing to localStorage:", error);
  }
}

// Shared context so all components share one fetch
interface ModelsContextValue {
  models: Model[];
  isLoading: boolean;
}

const ModelsContext = createContext<ModelsContextValue | null>(null);

/**
 * Provider that fetches models ONCE and shares the result with all consumers.
 * Place this inside the main Providers component.
 */
export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Model[]>(FALLBACK_MODELS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchModels() {
      try {
        const response = await fetch("/api/v1/models", {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch models");
        }

        const data = await response.json();
        if (!abortController.signal.aborted && data.models?.length > 0) {
          setModels(data.models);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching models:", error);
          // Keep using fallback models
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchModels();

    return () => {
      abortController.abort();
    };
  }, []);

  const value = useMemo(() => ({ models, isLoading }), [models, isLoading]);

  return (
    <ModelsContext value={value}>
      {children}
    </ModelsContext>
  );
}

/**
 * Hook to consume the shared models data.
 * Must be used within a ModelsProvider.
 */
export function useModels(): ModelsContextValue {
  const ctx = useContext(ModelsContext);
  if (ctx) return ctx;

  // Fallback for components outside the provider (e.g., login page)
  // — returns static fallback models without fetching
  return { models: FALLBACK_MODELS, isLoading: false };
}
