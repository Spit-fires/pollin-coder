/**
 * Feature flags — DB-backed with environment variable fallback.
 *
 * Read priority: FeatureFlag table → process.env → false
 * Write: Admin panel → POST /api/admin/features → upserts FeatureFlag row
 */

import { getPrisma } from "./prisma";

/** Canonical flag keys (keep in sync with admin UI) */
export const FEATURE_KEYS = {
  UPLOADS: "uploadEnabled",
  SCREENSHOT_FLOW: "screenshotFlowEnabled",
  SHADCN: "shadcnEnabled",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

// ──────────────────────────── Reads ────────────────────────────

/**
 * Read a single flag. Checks DB first, then env var, then defaults to false.
 */
export async function getFeatureFlag(key: FeatureKey): Promise<boolean> {
  try {
    const prisma = getPrisma();
    const row = await prisma.featureFlag.findUnique({ where: { key } });
    if (row) return row.enabled;
  } catch {
    // DB unavailable — fall through to env
  }
  return envFallback(key);
}

/** Read all flags (used by admin panel & public endpoint). */
export async function getAllFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  const defaults: Record<FeatureKey, boolean> = {
    [FEATURE_KEYS.UPLOADS]: envFallback(FEATURE_KEYS.UPLOADS),
    [FEATURE_KEYS.SCREENSHOT_FLOW]: envFallback(FEATURE_KEYS.SCREENSHOT_FLOW),
    [FEATURE_KEYS.SHADCN]: envFallback(FEATURE_KEYS.SHADCN),
  };

  try {
    const prisma = getPrisma();
    const rows = await prisma.featureFlag.findMany();
    for (const row of rows) {
      if (row.key in defaults) {
        defaults[row.key as FeatureKey] = row.enabled;
      }
    }
  } catch {
    // DB unavailable — env defaults already set
  }

  return defaults;
}

// ──────────────────────────── Writes ───────────────────────────

/** Upsert a flag in the DB. */
export async function setFeatureFlag(
  key: FeatureKey,
  enabled: boolean,
  description?: string
): Promise<void> {
  const prisma = getPrisma();
  await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled, ...(description !== undefined ? { description } : {}) },
    create: { key, enabled, description },
  });
}

// ──────────── Convenience helpers (backward-compat) ────────────

export async function isUploadEnabled(): Promise<boolean> {
  return getFeatureFlag(FEATURE_KEYS.UPLOADS);
}

export async function isScreenshotFlowEnabled(): Promise<boolean> {
  return getFeatureFlag(FEATURE_KEYS.SCREENSHOT_FLOW);
}

export async function isShadcnEnabled(): Promise<boolean> {
  return getFeatureFlag(FEATURE_KEYS.SHADCN);
}

export function getUploadDisabledMessage(): string {
  return "This feature is unavailable in this version";
}

// ────────────────── Env var fallback mapping ───────────────────

function envFallback(key: FeatureKey): boolean {
  const map: Record<FeatureKey, string | undefined> = {
    [FEATURE_KEYS.UPLOADS]: process.env.ENABLE_UPLOADS,
    [FEATURE_KEYS.SCREENSHOT_FLOW]: process.env.ENABLE_SCREENSHOT_FLOW,
    [FEATURE_KEYS.SHADCN]: process.env.ENABLE_SHADCN,
  };
  return map[key] === "true";
}
