'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Workflow, Play, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  isOwned?: boolean;
  executionCount?: number;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/n8n/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      toast.error('Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    setExecuting(workflowId);
    try {
      const response = await fetch('/api/n8n/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          data: {
            trigger: 'manual',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Workflow execution started: ${data.executionId}`);
      } else {
        throw new Error('Failed to execute workflow');
      }
    } catch (error) {
      toast.error('Failed to execute workflow');
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className="space-y-8" data-testid="workflows-page">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">n8n Workflows</h1>
        <p className="text-gray-600">Manage and execute your automation workflows</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Workflow className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">No workflows found</p>
            <p className="text-sm text-gray-400">Create workflows in your n8n instance</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <div className={`w-2 h-2 rounded-full ${
                    workflow.active ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </div>
                <CardDescription>
                  {workflow.isOwned ? 'Your workflow' : 'Shared workflow'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Executions:</span>
                  <span className="font-medium">{workflow.executionCount || 0}</span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => executeWorkflow(workflow.id)}
                  disabled={executing === workflow.id}
                  data-testid={`execute-workflow-${workflow.id}`}
                >
                  {executing === workflow.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
