import { z } from "zod";
import { callPollinationsAPIStream } from "@/lib/pollinations";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser, extractApiKeyFromHeader } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Rate limit: 20 completions per minute per IP (generous for normal use, blocks abuse)
const COMPLETION_RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };

// Validation schemas
const requestSchema = z.object({
  messageId: z.string().min(1),
  model: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    // Rate limiting — prevents LLM API abuse
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`completion:${clientIp}`, COMPLETION_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, COMPLETION_RATE_LIMIT);
    }

    // Extract API key from request header
    const apiKey = extractApiKeyFromHeader(req);
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }), 
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Get authenticated user
    const user = await getCurrentUser(apiKey);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }), 
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Enforce request body size limit (4KB max) to prevent memory abuse
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > 4096) {
      return new Response(
        JSON.stringify({ error: "Payload too large" }),
        {
          status: 413,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const parseResult = requestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parseResult.error.issues }), 
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const { messageId, model } = parseResult.data;
    
    // Use shared Prisma singleton
    const prisma = getPrisma();

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: true,
      },
    });

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message not found" }), 
        { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // CRITICAL: Check ownership - prevent IDOR attack
    if (message.chat.userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "Access denied" }), 
        { 
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const messagesRes = await prisma.message.findMany({
      where: { chatId: message.chatId, position: { lte: message.position } },
      orderBy: { position: "asc" },
    });

    let messages = z
      .array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        }),
      )
      .parse(messagesRes);

    if (messages.length > 10) {
      messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
    }

    const response = await callPollinationsAPIStream(apiKey, {
      model,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.2,
      max_tokens: 9000,
      referrer: "pollin-coder"
    });

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in completion stream:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export const maxDuration = 45;
