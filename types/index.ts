export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: unknown[];
  connections: unknown;
  settings?: unknown;
  staticData?: unknown;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData?: unknown;
  data?: {
    resultData: {
      runData: unknown;
    };
  };
  status?: 'running' | 'success' | 'failed' | 'waiting';
}

export interface N8nExecutePayload {
  workflowId: string;
  data?: Record<string, unknown>;
}

export interface AIGenerationRequest {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  topic: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  length: 'short' | 'medium' | 'long';
}

export interface AIGenerationResponse {
  content: string;
  hashtags: string[];
  imagePrompt: string;
  characterCount: number;
  platformLimit: number;
}

export interface SchedulePostRequest {
  content: string;
  platform: string;
  hashtags: string[];
  scheduledAt: string;
}

export interface AnalyticsSummary {
  totalPosts: number;
  successRate: number;
  platformBreakdown: Record<string, number>;
  recentActivity: Array<{
    date: string;
    posts: number;
  }>;
}
