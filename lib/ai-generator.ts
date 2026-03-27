import axios from 'axios';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export interface GenerateContentParams {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  topic: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  length: 'short' | 'medium' | 'long';
}

export interface GeneratedContent {
  content: string;
  hashtags: string[];
  imagePrompt: string;
  characterCount: number;
  platformLimit: number;
}

const PLATFORM_LIMITS = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
};

const LENGTH_INSTRUCTIONS = {
  short: 'Keep it concise and punchy (1-2 sentences)',
  medium: 'Write a moderately detailed post (3-5 sentences)',
  long: 'Create a comprehensive post with multiple paragraphs',
};

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'mistralai/mistral-small-4-119b-2603';

export class AIContentGenerator {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.NVIDIA_API_KEY;
    
    if (!key) {
      throw new Error('NVIDIA API key is required. Set NVIDIA_API_KEY environment variable.');
    }

    this.apiKey = key;
  }

  async generateContent(params: GenerateContentParams): Promise<GeneratedContent> {
    const { platform, topic, tone, length } = params;
    const platformLimit = PLATFORM_LIMITS[platform];
    const lengthInstruction = LENGTH_INSTRUCTIONS[length];

    logger.info({ platform, topic, tone, length }, 'Generating content with NVIDIA API');

    const systemPrompt = `You are an expert social media content creator specializing in ${platform}. 
Create engaging, platform-optimized content that drives engagement and conversions.
Always include relevant emojis where appropriate for the platform.`;

    const userPrompt = `Create a ${tone} ${platform} post about: ${topic}

Requirements:
- ${lengthInstruction}
- Stay within ${platformLimit} characters
- Include 10-15 relevant hashtags
- Suggest a detailed image prompt for visual content
- Make it engaging and shareable
- Use appropriate emojis

Respond in JSON format:
{
  "content": "the post text",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "imagePrompt": "detailed image description"
}`;

    try {
      const response = await axios.post(
        NVIDIA_API_URL,
        {
          model: NVIDIA_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const responseText = response.data.choices[0]?.message?.content || '';

      if (!responseText) {
        throw new Error('Empty response from NVIDIA API');
      }

      let parsed: { content: string; hashtags: string[]; imagePrompt: string };
      
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        logger.error({ parseError, responseText }, 'Failed to parse AI response');
        throw new Error('Failed to parse AI response as JSON');
      }

      const content = parsed.content.trim();
      const characterCount = content.length;

      if (characterCount > platformLimit) {
        logger.warn(
          { characterCount, platformLimit },
          'Generated content exceeds platform limit'
        );
      }

      const result: GeneratedContent = {
        content,
        hashtags: parsed.hashtags.slice(0, 15),
        imagePrompt: parsed.imagePrompt,
        characterCount,
        platformLimit,
      };

      logger.info({ characterCount, hashtagCount: result.hashtags.length }, 'Content generated successfully with NVIDIA API');
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ 
          error: error.message,
          status: error.response?.status,
          data: error.response?.data 
        }, 'Failed to generate content with NVIDIA API');
      } else {
        logger.error({ error }, 'Failed to generate content');
      }
      throw error;
    }
  }


  async enrichContentWithN8n(
    content: string,
    platform: string,
    userId: string
  ): Promise<unknown> {
    logger.info({ platform, userId }, 'Enriching content with n8n');
    return {
      content,
      platform,
      userId,
      timestamp: new Date().toISOString(),
    };
  }
}

let generatorInstance: AIContentGenerator | null = null;

export function getAIGenerator(apiKey?: string): AIContentGenerator {
  if (!generatorInstance) {
    generatorInstance = new AIContentGenerator(apiKey);
  }
  return generatorInstance;
}

export default AIContentGenerator;
