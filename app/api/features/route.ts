import { NextResponse } from "next/server";
import { getAllFeatureFlags } from "@/lib/features";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Rate limit: 30 requests per minute per IP
const FEATURES_RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 };

export async function GET(request: Request) {
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(`features:${clientIp}`, FEATURES_RATE_LIMIT);
  if (!rl.allowed) {
    return rateLimitResponse(rl, FEATURES_RATE_LIMIT);
  }

  const flags = await getAllFeatureFlags();
  return NextResponse.json({
    uploadsEnabled: flags.uploadEnabled,
    screenshotFlowEnabled: flags.screenshotFlowEnabled,
    shadcnEnabled: flags.shadcnEnabled,
  });
}
