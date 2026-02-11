import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const apiKey = cookieStore.get("pollinations_api_key")?.value;

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
      // Key is invalid, clear it
      cookieStore.delete("pollinations_api_key");
      cookieStore.delete("pollinations_profile");
      return NextResponse.json(
        { authenticated: false, message: "API key is invalid or expired" },
        { status: 401 }
      );
    }

    const keyInfo = await keyResponse.json();

    if (!keyInfo.valid) {
      // Key is invalid, clear it
      cookieStore.delete("pollinations_api_key");
      cookieStore.delete("pollinations_profile");
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

    // Whitelist specific fields to prevent leaking sensitive upstream data
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
