import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { getN8nClient } from './n8n-client';
import { prisma } from './prisma';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export interface ScheduledPostJob {
  postId: string;
  userId: string;
  content: string;
  platform: string;
  hashtags: string[];
  n8nWorkflowId?: string;
}

export const postQueue = new Queue<ScheduledPostJob>('scheduled-posts', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
});

export async function schedulePost(
  post: ScheduledPostJob,
  scheduledAt: Date
): Promise<string> {
  const delay = scheduledAt.getTime() - Date.now();
  
  if (delay < 0) {
    throw new Error('Scheduled time must be in the future');
  }

  const job = await postQueue.add('publish-post', post, {
    delay,
    jobId: post.postId,
  });

  logger.info(
    { jobId: job.id, postId: post.postId, scheduledAt },
    'Post scheduled successfully'
  );

  return job.id!;
}

export async function cancelScheduledPost(postId: string): Promise<void> {
  const job = await postQueue.getJob(postId);
  
  if (job) {
    await job.remove();
    logger.info({ postId }, 'Scheduled post cancelled');
  }
}

export function createWorker() {
  const worker = new Worker<ScheduledPostJob>(
    'scheduled-posts',
    async (job: Job<ScheduledPostJob>) => {
      const { postId, userId, content, platform, hashtags, n8nWorkflowId } = job.data;

      logger.info({ postId, platform }, 'Processing scheduled post');

      try {
        const n8nClient = getN8nClient();
        
        let executionId: string;
        
        if (n8nWorkflowId) {
          executionId = await n8nClient.executeWorkflow(n8nWorkflowId, {
            content,
            platform,
            hashtags,
            userId,
          });
        } else {
          const workflows = await n8nClient.listWorkflows();
          const publisherWorkflow = workflows.find(w => 
            w.name.toLowerCase().includes('publisher')
          );
          
          if (!publisherWorkflow?.id) {
            throw new Error('No publisher workflow found');
          }
          
          executionId = await n8nClient.executeWorkflow(publisherWorkflow.id, {
            content,
            platform,
            hashtags,
            userId,
          });
        }

        const execution = await n8nClient.pollExecutionStatus(executionId, 10, 3000);

        if (execution.status === 'success') {
          await prisma.post.update({
            where: { id: postId },
            data: {
              status: 'published',
              publishedAt: new Date(),
              n8nExecutionId: executionId,
            },
          });

          logger.info({ postId, executionId }, 'Post published successfully');
          return { success: true, executionId };
        } else {
          throw new Error(`Execution failed with status: ${execution.status}`);
        }
      } catch (error) {
        logger.error({ error, postId }, 'Failed to publish post');
        
        await prisma.post.update({
          where: { id: postId },
          data: { status: 'failed' },
        });

        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
  });

  logger.info('Worker started and listening for scheduled posts');

  return worker;
}
