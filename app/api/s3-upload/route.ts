import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { POST as s3Post } from "next-s3-upload/route";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Rate limit: 10 S3 uploads per minute per IP
const S3_UPLOAD_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 };

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// S3 upload endpoint - wrapped with authentication and validation
export async function POST(request: Request) {
  try {
    // Rate limiting — prevents S3 cost explosion
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`s3-upload:${clientIp}`, S3_UPLOAD_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, S3_UPLOAD_RATE_LIMIT);
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check content-length header for size limit
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 413 }
      );
    }

    // next-s3-upload expects NextRequest but we validate auth first
    return s3Post(request as any);
  } catch (error) {
    console.error("S3 upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
