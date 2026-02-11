import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

const deleteSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
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
    const searchParam = searchParams.get('search');
    if (searchParam) params.search = searchParam;
    
    const queryResult = querySchema.safeParse(params);

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { page, limit, search } = queryResult.data;
    const skip = (page - 1) * limit;

    const prisma = getPrisma();
    
    // Build where clause for search
    const where = search
      ? {
          OR: [
            { email: { contains: search } },
            { name: { contains: search } },
          ],
        }
      : {};

    // Fetch users with their chat counts
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          tier: true,
          role: true,
          createdAt: true,
          _count: {
            select: { chats: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
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
    
    console.error('Error fetching users:', error);
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
    const rl = checkRateLimit(`admin-delete-user:${admin.id}:${clientIp}`, DELETE_RATE_LIMIT);
    if (!rl.allowed) {
      return rateLimitResponse(rl, DELETE_RATE_LIMIT);
    }

    const { searchParams } = new URL(request.url);
    const deleteParams = {
      userId: searchParams.get('userId') || '',
    };

    const validationResult = deleteSchema.safeParse(deleteParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId } = validationResult.data;

    const prisma = getPrisma();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, _count: { select: { chats: true } } },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Delete user (cascade will delete related chats and messages)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Log admin action
    await logAdminAction(admin.id, 'DELETE_USER', userId, {
      email: user.email,
      chatCount: user._count.chats,
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} and ${user._count.chats} chats deleted`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
