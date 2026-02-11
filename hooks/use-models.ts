import { useState, useEffect } from "react";
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

export function useModels() {
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

  return { models, isLoading };
}
