import { getPrisma } from "@/lib/prisma";
import { getCurrentUser, extractApiKeyFromHeader } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().min(1),
});

/**
 * Verify chat ownership. Returns { owned: true } if the authenticated user
 * owns the chat, 403 otherwise. Used by the client page component to
 * prevent read-only IDOR on chat data.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = extractApiKeyFromHeader(request);
    const user = await getCurrentUser(apiKey || undefined);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const paramsResult = paramsSchema.safeParse(resolvedParams);

    if (!paramsResult.success) {
      return NextResponse.json(
        { error: "Invalid chat ID" },
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;
    const prisma = getPrisma();

    const chat = await prisma.chat.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    if (chat.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ owned: true });
  } catch (error) {
    console.error('Error verifying chat ownership:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
