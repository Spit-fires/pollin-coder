import { NextResponse } from "next/server";
import { extractApiKeyFromHeader } from "@/lib/auth";

/**
 * Auth status check — reads API key from X-Pollinations-Key header.
 * Client calls this with authFetch() which attaches the header automatically.
 */
export async function GET(request: Request) {
  try {
    const apiKey = extractApiKeyFromHeader(request);

    if (!apiKey) {
      return NextResponse.json(
        { authenticated: false, message: "No API key found" },
        { status: 401 }
      );
    }

    // Validate the key and get its info
    const keyResponse = await fetch(
      "https://gen.pollinations.ai/account/key",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!keyResponse.ok) {
      return NextResponse.json(
        { authenticated: false, message: "API key is invalid or expired" },
        { status: 401 }
      );
    }

    const keyInfo = await keyResponse.json();

    if (!keyInfo.valid) {
      return NextResponse.json(
        { authenticated: false, message: "API key is not valid" },
        { status: 401 }
      );
    }

    // Fetch profile info
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
      console.warn("Failed to fetch profile:", error);
    }

    // Fetch balance info
    let balanceInfo = null;
    try {
      const balanceResponse = await fetch(
        "https://gen.pollinations.ai/account/balance",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      if (balanceResponse.ok) {
        balanceInfo = await balanceResponse.json();
      }
    } catch (error) {
      console.warn("Failed to fetch balance:", error);
    }

    return NextResponse.json({
      authenticated: true,
      keyInfo: keyInfo ? { valid: keyInfo.valid, tier: keyInfo.tier } : null,
      profile: profileInfo ? {
        name: profileInfo.name,
        email: profileInfo.email,
        image: profileInfo.image,
        tier: profileInfo.tier,
      } : null,
      balance: balanceInfo ? {
        balance: balanceInfo.balance,
        currency: balanceInfo.currency,
      } : null,
    });
  } catch (error) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      { authenticated: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
