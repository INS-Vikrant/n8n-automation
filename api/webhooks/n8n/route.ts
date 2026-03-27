import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import pino from 'pino';

const logger = pino();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    logger.info({ body }, 'Received n8n webhook');

    const { executionId, workflowId, status, result, userId } = body;

    if (!executionId) {
      return NextResponse.json(
        { error: 'Missing executionId' },
        { status: 400 }
      );
    }

    const execution = await prisma.execution.findFirst({
      where: { n8nExecutionId: executionId },
    });

    if (execution) {
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: status || 'success',
          result: result || {},
          finishedAt: new Date(),
        },
      });
    }

    const post = await prisma.post.findFirst({
      where: { n8nExecutionId: executionId },
    });

    if (post) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: status === 'success' ? 'published' : 'failed',
          publishedAt: status === 'success' ? new Date() : null,
        },
      });
    }

    logger.info({ executionId, status }, 'Webhook processed');

    return NextResponse.json(
      { message: 'Webhook processed' },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error }, 'Webhook processing failed');
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
