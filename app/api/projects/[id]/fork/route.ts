import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }

    // Await and validate params (Next.js 15+ requires awaiting params)
    const resolvedParams = await params;
    const paramsResult = paramsSchema.safeParse(resolvedParams);

    if (!paramsResult.success) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;
    const prisma = getPrisma();
    
    const originalChat = await prisma.chat.findUnique({
      where: { id },
      include: { messages: true }
    });

    if (!originalChat) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Authorization: only allow forking own projects or public projects (no userId)
    if (originalChat.userId && originalChat.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create a new chat with the same content, owned by current user
    const newChat = await prisma.chat.create({
      data: {
        title: `${originalChat.title} (Fork)`,
        prompt: originalChat.prompt,
        model: originalChat.model,
        quality: originalChat.quality,
        pollinCoderVersion: originalChat.pollinCoderVersion,
        shadcn: originalChat.shadcn,
        userId: user.id, // Associate with current user
        messages: {
          create: originalChat.messages.map((msg, index) => ({
            role: msg.role,
            content: msg.content,
            position: index
          }))
        }
      }
    });

    return NextResponse.json({ newChatId: newChat.id });
  } catch (error) {
    console.error('Error forking project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 