import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
import {
  getAllFeatureFlags,
  setFeatureFlag,
  FEATURE_KEYS,
  type FeatureKey,
} from "@/lib/features";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const features = await getAllFeatureFlags();

    return NextResponse.json({ features });
  } catch (error) {
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching features:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

const validKeys = Object.values(FEATURE_KEYS) as [string, ...string[]];

const updateSchema = z.object({
  feature: z.enum(validKeys) as z.ZodType<FeatureKey>,
  enabled: z.boolean(),
});

// Rate limit: 20 feature toggles per minute
const UPDATE_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60_000,
};

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);

    // Apply rate limiting per admin
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`admin-update-feature:${admin.id}:${clientIp}`, UPDATE_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, UPDATE_RATE_LIMIT);
    }

    const body = await request.json();
    const parseResult = updateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { feature, enabled } = parseResult.data;

    await setFeatureFlag(feature, enabled);

    await logAdminAction(admin.id, "UPDATE_FEATURE", undefined, {
      feature,
      enabled,
    });

    return NextResponse.json({
      success: true,
      feature,
      enabled,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error updating feature:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
