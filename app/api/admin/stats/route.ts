import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    // Require admin authentication
    await requireAdmin(request);

    const prisma = getPrisma();

    // Fetch comprehensive system statistics
    const [
      totalUsers,
      totalChats,
      totalMessages,
      totalApps,
      chatsByModel,
      recentUsers,
      recentChats,
    ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.chat.count(),
      prisma.message.count(),
      prisma.generatedApp.count(),

      // Chats grouped by model
      prisma.chat.groupBy({
        by: ['model'],
        _count: true,
        orderBy: {
          _count: {
            model: 'desc',
          },
        },
      }),

      // Recent user registrations (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Recent chats created (last 7 days)
      prisma.chat.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Format model breakdown
    const modelBreakdown = chatsByModel.map(item => ({
      model: item.model,
      count: item._count,
    }));

    return NextResponse.json({
      overview: {
        totalUsers,
        totalChats,
        totalMessages,
        totalGeneratedApps: totalApps,
      },
      recent: {
        newUsersLast7Days: recentUsers,
        newChatsLast7Days: recentChats,
      },
      breakdown: {
        chatsByModel: modelBreakdown,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
