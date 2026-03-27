import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';
import pino from 'pino';

const logger = pino();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

    const posts = await prisma.post.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        platform: true,
        status: true,
        createdAt: true,
      },
    });

    const analytics = await prisma.analyticsDay.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    const totalPosts = posts.length;
    const successfulPosts = posts.filter(p => p.status === 'published').length;
    const successRate = totalPosts > 0 ? (successfulPosts / totalPosts) * 100 : 0;

    const platformBreakdown = posts.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentActivity = analytics.map(day => ({
      date: day.date.toISOString().split('T')[0],
      posts: day.postsGenerated,
      successRate: day.successRate,
    }));

    return NextResponse.json(
      {
        totalPosts,
        successRate: Math.round(successRate * 100) / 100,
        platformBreakdown,
        recentActivity,
        period: '30 days',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error }, 'Failed to fetch analytics');
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
