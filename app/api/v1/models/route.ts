import { NextResponse } from "next/server";import { FALLBACK_MODELS } from "@/lib/constants";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
export const runtime = "nodejs";

const POLLINATIONS_MODELS_ENDPOINT = "https://gen.pollinations.ai/v1/models";

// Rate limit: 20 requests per minute per IP
const MODELS_RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };

export async function GET(request: Request) {
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(`models:${clientIp}`, MODELS_RATE_LIMIT);
  if (!rl.allowed) {
    return rateLimitResponse(rl, MODELS_RATE_LIMIT);
  }

  try {
    const response = await fetch(POLLINATIONS_MODELS_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the response to match our app's model format
    // Pollinations returns an array of model objects with { id, name, ... }
    const models = data.data?.map((model: any) => ({
      label: model.name || model.id,
      value: model.id,
    })) || [];

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models from Pollinations:", error);
    
    // Return fallback models if the API fails
    return NextResponse.json(
      { models: FALLBACK_MODELS },
      { status: 200 }
    );
  }
}
