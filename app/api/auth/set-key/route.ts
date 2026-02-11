import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Rate limit: 5 login attempts per minute per IP
const AUTH_RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };

const requestSchema = z.object({
  apiKey: z.string().min(1).max(500),
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

    // Validate the API key by checking with Pollinations
    const validateResponse = await fetch(
      "https://gen.pollinations.ai/account/key",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

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

    // Optionally fetch profile info
    let profileInfo = null;
    try {
      const profileResponse = await fetch(
        "https://gen.pollinations.ai/account/profile",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      if (profileResponse.ok) {
        profileInfo = await profileResponse.json();
      }
    } catch (error) {
      // Profile fetch is optional, continue without it
      console.warn("Failed to fetch profile:", error);
    }

    // Set the API key as an httpOnly cookie with strict SameSite for CSRF protection
    const cookieStore = await cookies();
    cookieStore.set("pollinations_api_key", apiKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    // Optionally store profile info in a separate cookie (not httpOnly since we want to read it client-side)
    if (profileInfo) {
      cookieStore.set(
        "pollinations_profile",
        JSON.stringify({
          name: profileInfo.name,
          email: profileInfo.email,
          image: profileInfo.image,
          tier: profileInfo.tier,
        }),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: "/",
        }
      );
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

    // Whitelist specific fields to prevent leaking sensitive upstream data
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
