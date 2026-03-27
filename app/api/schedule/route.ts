import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { schedulePost } from '@/lib/scheduler';
import { z } from 'zod';
import pino from 'pino';

const logger = pino();

const scheduleSchema = z.object({
  content: z.string().min(1),
  platform: z.string(),
  hashtags: z.array(z.string()),
  scheduledAt: z.string().datetime(),
  n8nWorkflowId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { content, platform, hashtags, scheduledAt, n8nWorkflowId } = scheduleSchema.parse(body);

    const scheduledDate = new Date(scheduledAt);

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content,
        platform,
        hashtags,
        status: 'scheduled',
        scheduledAt: scheduledDate,
      },
    });

    await schedulePost(
      {
        postId: post.id,
        userId,
        content,
        platform,
        hashtags,
        n8nWorkflowId,
      },
      scheduledDate
    );

    logger.info({ postId: post.id, scheduledAt }, 'Post scheduled');

    return NextResponse.json(
      { message: 'Post scheduled successfully', post },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Failed to schedule post');
    return NextResponse.json(
      { error: 'Failed to schedule post' },
      { status: 500 }
    );
  }
}

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

    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch posts');
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
