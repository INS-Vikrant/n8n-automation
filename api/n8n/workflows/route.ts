import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getN8nClient } from '@/lib/n8n-client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import pino from 'pino';

const logger = pino();

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  nodes: z.array(z.any()),
  connections: z.any(),
  settings: z.any().optional(),
});

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
    const n8nClient = getN8nClient();

    const n8nWorkflows = await n8nClient.listWorkflows();

    const dbWorkflows = await prisma.workflow.findMany({
      where: { userId },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    });

    const workflowsMap = new Map(dbWorkflows.map(w => [w.n8nWorkflowId, w]));

    const enrichedWorkflows = n8nWorkflows.map(n8nWf => {
      const dbWf = workflowsMap.get(n8nWf.id!);
      return {
        ...n8nWf,
        isOwned: !!dbWf,
        executionCount: dbWf?._count.executions || 0,
      };
    });

    return NextResponse.json(
      { workflows: enrichedWorkflows },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error }, 'Failed to list workflows');
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    );
  }
}

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
    const workflowData = createWorkflowSchema.parse(body);

    const n8nClient = getN8nClient();
    const n8nWorkflow = await n8nClient.createWorkflow({
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings,
      active: false,
    });

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        n8nWorkflowId: n8nWorkflow.id!,
        name: workflowData.name,
        type: workflowData.type,
        config: workflowData,
        isActive: false,
      },
    });

    logger.info({ workflowId: workflow.id, n8nWorkflowId: n8nWorkflow.id }, 'Workflow created');

    return NextResponse.json(
      { message: 'Workflow created successfully', workflow, n8nWorkflow },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Failed to create workflow');
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
