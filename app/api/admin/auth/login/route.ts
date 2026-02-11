import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword, generateAdminToken, storeAdminSession } from "@/lib/admin-auth";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Strict rate limit for admin login: 5 attempts per 15 minutes per IP
const ADMIN_LOGIN_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Rate limiting - critical for brute-force protection
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`admin-login:${clientIp}`, ADMIN_LOGIN_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, ADMIN_LOGIN_RATE_LIMIT);
    }

    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Fetch admin from database
    const prisma = getPrisma();
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, admin.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate session token
    const token = generateAdminToken();
    await storeAdminSession(token, admin.id, admin.email);

    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
