import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Rate limit: 30 requests per minute per IP
const COUNT_RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 };

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`project-count:${clientIp}`, COUNT_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, COUNT_RATE_LIMIT);
    }

    const prisma = getPrisma();
    
    // Get the total count of all projects
    const count = await prisma.chat.count();
    
    // Set cache control headers
    const response = NextResponse.json({ 
      count,
      timestamp: new Date().toISOString(),
    });
    response.headers.set('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
    
    return response;
  } catch (error) {
    console.error('Error fetching project count:', error);
    
    // Don't leak error details to client
    return NextResponse.json(
      { error: 'Failed to fetch project count' },
      { status: 500 }
    );
  }
} 