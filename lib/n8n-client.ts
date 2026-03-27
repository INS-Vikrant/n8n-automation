import axios, { AxiosInstance, AxiosError } from 'axios';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export interface N8nClientConfig {
  baseUrl: string;
  apiToken: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface N8nWorkflow {
  id?: string;
  name: string;
  active?: boolean;
  nodes: unknown[];
  connections: unknown;
  settings?: unknown;
  staticData?: unknown;
  tags?: string[];
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status?: 'running' | 'success' | 'failed' | 'waiting';
  data?: unknown;
  error?: string;
}

export interface N8nExecuteResponse {
  data: {
    executionId: string;
  };
}

export class N8nClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: N8nClientConfig) {
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any;
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry >= this.maxRetries) {
          logger.error({ error: error.message }, 'Max retries reached');
          return Promise.reject(error);
        }

        config.retry += 1;
        const delay = this.retryDelay * Math.pow(2, config.retry - 1);
        
        logger.warn(
          { attempt: config.retry, delay },
          `Retrying request after ${delay}ms`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.client(config);
      }
    );
  }

  async createWorkflow(workflow: N8nWorkflow): Promise<N8nWorkflow> {
    try {
      logger.info({ name: workflow.name }, 'Creating n8n workflow');
      const response = await this.client.post<N8nWorkflow>('/api/v1/workflows', workflow);
      logger.info({ id: response.data.id }, 'Workflow created successfully');
      return response.data;
    } catch (error) {
      logger.error({ error }, 'Failed to create workflow');
      throw this.handleError(error);
    }
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    try {
      const response = await this.client.get<N8nWorkflow>(`/api/v1/workflows/${id}`);
      return response.data;
    } catch (error) {
      logger.error({ error, id }, 'Failed to get workflow');
      throw this.handleError(error);
    }
  }

  async listWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.client.get<{ data: N8nWorkflow[] }>('/api/v1/workflows');
      return response.data.data || [];
    } catch (error) {
      logger.error({ error }, 'Failed to list workflows');
      throw this.handleError(error);
    }
  }

  async executeWorkflow(
    workflowId: string,
    data?: Record<string, unknown>
  ): Promise<string> {
    try {
      logger.info({ workflowId }, 'Executing workflow');
      const response = await this.client.post<N8nExecuteResponse>(
        `/api/v1/workflows/${workflowId}/execute`,
        data || {}
      );
      const executionId = response.data.data.executionId;
      logger.info({ executionId }, 'Workflow execution started');
      return executionId;
    } catch (error) {
      logger.error({ error, workflowId }, 'Failed to execute workflow');
      throw this.handleError(error);
    }
  }

  async getExecution(executionId: string): Promise<N8nExecution> {
    try {
      const response = await this.client.get<N8nExecution>(
        `/api/v1/executions/${executionId}`
      );
      return response.data;
    } catch (error) {
      logger.error({ error, executionId }, 'Failed to get execution');
      throw this.handleError(error);
    }
  }

  async getWorkflowExecutions(workflowId: string): Promise<N8nExecution[]> {
    try {
      const response = await this.client.get<{ data: N8nExecution[] }>(
        `/api/v1/workflows/${workflowId}/executions`
      );
      return response.data.data || [];
    } catch (error) {
      logger.error({ error, workflowId }, 'Failed to get workflow executions');
      throw this.handleError(error);
    }
  }

  async pollExecutionStatus(
    executionId: string,
    maxAttempts: number = 20,
    interval: number = 3000
  ): Promise<N8nExecution> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const execution = await this.getExecution(executionId);
      
      if (execution.finished) {
        logger.info({ executionId, status: execution.status }, 'Execution completed');
        return execution;
      }

      logger.info(
        { executionId, attempt: attempt + 1, maxAttempts },
        'Execution still running...'
      );
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Execution ${executionId} timed out after ${maxAttempts} attempts`);
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      const status = error.response?.status;
      return new Error(`n8n API Error (${status}): ${message}`);
    }
    return error as Error;
  }
}

let n8nClientInstance: N8nClient | null = null;

export function getN8nClient(): N8nClient {
  if (!n8nClientInstance) {
    n8nClientInstance = new N8nClient({
      baseUrl: process.env.N8N_BASE_URL!,
      apiToken: process.env.N8N_API_TOKEN!,
      maxRetries: 3,
      retryDelay: 1000,
    });
  }
  return n8nClientInstance;
}

export default N8nClient;
