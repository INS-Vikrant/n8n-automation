import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getN8nClient } from '@/lib/n8n-client';
import { prisma } from '@/lib/prisma';
import pino from 'pino';

const logger = pino();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const executionId = params.id;
    const n8nClient = getN8nClient();

    const execution = await n8nClient.getExecution(executionId);

    const dbExecution = await prisma.execution.findFirst({
      where: { n8nExecutionId: executionId },
      include: {
        workflow: true,
      },
    });

    if (dbExecution && execution.finished) {
      await prisma.execution.update({
        where: { id: dbExecution.id },
        data: {
          status: execution.status || 'success',
          result: execution.data,
          finishedAt: execution.stoppedAt ? new Date(execution.stoppedAt) : new Date(),
        },
      });
    }

    return NextResponse.json(
      { execution, dbExecution },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error }, 'Failed to get execution');
    return NextResponse.json(
      { error: 'Failed to get execution' },
      { status: 500 }
    );
  }
}
