import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/admin-auth";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Rate limit for admin registration: 3 attempts per hour per IP
const ADMIN_REGISTER_RATE_LIMIT = { maxRequests: 3, windowMs: 60 * 60 * 1000 };

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
  registrationKey: z.string().optional(), // Secret key to prevent unauthorized registrations
});

export async function POST(request: Request) {
  try {
    // Check if admin registration is explicitly allowed
    const allowRegistration = process.env.ALLOW_ADMIN_REGISTRATION === 'true';

    if (!allowRegistration) {
      return NextResponse.json(
        { error: "Admin registration is disabled" },
        { status: 403 }
      );
    }

    const requiredKey = process.env.ADMIN_REGISTRATION_KEY;

    // Reject known placeholder values
    const INSECURE_KEYS = [
      'change_this_to_a_secure_random_string',
      'CHANGE_ME_IMMEDIATELY',
      'changeme',
      '',
    ];

    if (!requiredKey || INSECURE_KEYS.includes(requiredKey)) {
      console.error(
        'SECURITY: ADMIN_REGISTRATION_KEY is missing or set to an insecure default. '
        + 'Set a strong random value before enabling admin registration.'
      );
      return NextResponse.json(
        { error: "Admin registration is misconfigured" },
        { status: 403 }
      );
    }

    // Rate limiting
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`admin-register:${clientIp}`, ADMIN_REGISTER_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, ADMIN_REGISTER_RATE_LIMIT);
    }

    const body = await request.json();
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { email, password, name, registrationKey } = parseResult.data;

    // Verify registration key if required
    if (requiredKey && registrationKey !== requiredKey) {
      return NextResponse.json(
        { error: "Invalid registration key" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();

    // Check if admin already exists
    const existing = await prisma.admin.findUnique({
      where: { email },
    });

    if (existing) {
      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { error: "Registration failed" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin account
    const admin = await prisma.admin.create({
      data: {
        email,
        passwordHash,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      admin,
      message: "Admin account created successfully",
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
