import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIGenerator } from '@/lib/ai-generator';
import { z } from 'zod';
import pino from 'pino';

const logger = pino();

const generateSchema = z.object({
  platform: z.enum(['twitter', 'linkedin', 'instagram', 'facebook']),
  topic: z.string().min(3),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'informative']),
  length: z.enum(['short', 'medium', 'long']),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + 60000,
    });
    return true;
  }

  if (userLimit.count >= 10) {
    return false;
  }

  userLimit.count++;
  return true;
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

    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in a minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const params = generateSchema.parse(body);

    logger.info({ userId, params }, 'Generating content');

    const generator = getAIGenerator();
    const result = await generator.generateContent(params);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Content generation failed');
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
