import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().optional(),
  model: z.string().optional(),
});

const deleteSchema = z.object({
  chatId: z.string().min(1, "Chat ID is required"),
});

// Rate limit: 10 deletions per minute
const DELETE_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60_000,
};

export async function GET(request: Request) {
  try {
    // Require admin authentication
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const params: Record<string, any> = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };
    const userIdParam = searchParams.get('userId');
    const modelParam = searchParams.get('model');
    if (userIdParam) params.userId = userIdParam;
    if (modelParam) params.model = modelParam;
    
    const queryResult = querySchema.safeParse(params);

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { page, limit, userId, model } = queryResult.data;
    const skip = (page - 1) * limit;

    const prisma = getPrisma();
    
    // Build where clause for filters
    const where: any = {};
    if (userId) where.userId = userId;
    if (model) where.model = model;

    // Fetch chats with user info and message counts
    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          prompt: true,
          model: true,
          quality: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.chat.count({ where }),
    ]);

    return NextResponse.json({
      chats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Require admin authentication
    const admin = await requireAdmin(request);

    // Apply rate limiting per admin
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`admin-delete-chat:${admin.id}:${clientIp}`, DELETE_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, DELETE_RATE_LIMIT);
    }

    const { searchParams } = new URL(request.url);
    const deleteParams = {
      chatId: searchParams.get('chatId') || '',
    };

    const validationResult = deleteSchema.safeParse(deleteParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { chatId } = validationResult.data;

    const prisma = getPrisma();

    // Check if chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { 
        title: true,
        user: { select: { email: true } },
        _count: { select: { messages: true } },
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    // Delete chat (cascade will delete related messages)
    await prisma.chat.delete({
      where: { id: chatId },
    });

    // Log admin action
    await logAdminAction(admin.id, 'DELETE_CHAT', chatId, {
      title: chat.title,
      userEmail: chat.user?.email,
      messageCount: chat._count.messages,
    });

    return NextResponse.json({
      success: true,
      message: `Chat "${chat.title}" deleted`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
