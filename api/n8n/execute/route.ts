import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getN8nClient } from '@/lib/n8n-client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import pino from 'pino';

const logger = pino();

const executeSchema = z.object({
  workflowId: z.string(),
  data: z.record(z.any()).optional(),
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
    const { workflowId, data } = executeSchema.parse(body);

    const n8nClient = getN8nClient();

    logger.info({ workflowId, userId }, 'Executing workflow');

    const executionId = await n8nClient.executeWorkflow(workflowId, {
      ...data,
      userId,
      timestamp: new Date().toISOString(),
    });

    const workflow = await prisma.workflow.findFirst({
      where: { n8nWorkflowId: workflowId, userId },
    });

    if (workflow) {
      await prisma.execution.create({
        data: {
          workflowId: workflow.id,
          n8nExecutionId: executionId,
          status: 'running',
        },
      });
    }

    return NextResponse.json(
      {
        message: 'Workflow execution started',
        executionId,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Failed to execute workflow');
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}
