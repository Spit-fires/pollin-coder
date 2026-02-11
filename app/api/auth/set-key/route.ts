import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Rate limit: 5 login attempts per minute per IP
const AUTH_RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };

const requestSchema = z.object({
  apiKey: z.string().regex(
    /^(sk_|pk_)[a-zA-Z0-9_-]{10,500}$/,
    "Invalid API key format"
  ),
});

export async function POST(request: Request) {
  try {
    // Rate limiting — critical for brute-force protection
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`set-key:${clientIp}`, AUTH_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, AUTH_RATE_LIMIT);
    }

    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: "Invalid request", errors: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { apiKey } = parseResult.data;

    // Validate the API key by checking with Pollinations (with timeout)
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 10_000);
    const validateResponse = await fetch(
      "https://gen.pollinations.ai/account/key",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller1.signal,
      }
    );
    clearTimeout(timeout1);

    if (!validateResponse.ok) {
      return NextResponse.json(
        { message: "Invalid API key or authentication failed" },
        { status: 401 }
      );
    }

    const keyInfo = await validateResponse.json();

    if (!keyInfo.valid) {
      return NextResponse.json(
        { message: "API key is not valid" },
        { status: 401 }
      );
    }

    // Optionally fetch profile info (with timeout)
    let profileInfo = null;
    try {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 10_000);
      const profileResponse = await fetch(
        "https://gen.pollinations.ai/account/profile",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller2.signal,
        }
      );
      clearTimeout(timeout2);
      if (profileResponse.ok) {
        profileInfo = await profileResponse.json();
      }
    } catch (error) {
      // Profile fetch is optional, continue without it
      console.warn("Failed to fetch profile:", error);
    }

    // Create or update user in database
    if (profileInfo && profileInfo.email) {
      const prisma = getPrisma();
      await prisma.user.upsert({
        where: { email: profileInfo.email },
        create: {
          email: profileInfo.email,
          name: profileInfo.name || null,
          tier: profileInfo.tier || null,
        },
        update: {
          name: profileInfo.name || null,
          tier: profileInfo.tier || null,
        },
      });
    }

    // Return validation result and profile (do NOT echo the API key back)
    return NextResponse.json({
      success: true,
      keyInfo: keyInfo ? { valid: keyInfo.valid, tier: keyInfo.tier } : null,
      profile: profileInfo ? {
        name: profileInfo.name,
        email: profileInfo.email,
        image: profileInfo.image,
        tier: profileInfo.tier,
      } : null,
    });
  } catch (error) {
    console.error("Error setting API key:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
