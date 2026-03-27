'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Wand2, Loader2, Copy, Check, Hash } from 'lucide-react';

interface GeneratedContent {
  content: string;
  hashtags: string[];
  imagePrompt: string;
  characterCount: number;
  platformLimit: number;
}

export default function GeneratePage() {
  const [platform, setPlatform] = useState('twitter');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          topic,
          tone,
          length,
        }),
      });

      if (response.status === 429) {
        toast.error('Rate limit exceeded. Please wait a minute.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      setGenerated(data);
      toast.success('Content generated successfully!');
    } catch (error) {
      toast.error('Failed to generate content');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generated) {
      const fullText = `${generated.content}\n\n${generated.hashtags.map(h => `#${h}`).join(' ')}`;
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOverLimit = generated && generated.characterCount > generated.platformLimit;

  return (
    <div className="space-y-8" data-testid="generate-page">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Generate Content</h1>
        <p className="text-gray-600">Create AI-powered social media posts in seconds</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Content Parameters</CardTitle>
            <CardDescription>Configure your content generation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform" data-testid="platform-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitter">Twitter / X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., AI in healthcare, sustainable living"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                data-testid="topic-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone" data-testid="tone-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="informative">Informative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="length">Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger id="length" data-testid="length-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                  <SelectItem value="medium">Medium (3-5 sentences)</SelectItem>
                  <SelectItem value="long">Long (Multiple paragraphs)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={loading}
              data-testid="generate-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>Your AI-generated social media post</CardDescription>
          </CardHeader>
          <CardContent>
            {!generated ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Wand2 className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No content generated yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Fill in the parameters and click Generate
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Post Content</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      data-testid="copy-button"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="whitespace-pre-wrap text-gray-800" data-testid="generated-content">
                      {generated.content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isOverLimit ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {generated.characterCount} / {generated.platformLimit} characters
                    </span>
                    {isOverLimit && (
                      <span className="text-red-600 text-xs">⚠️ Exceeds platform limit</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center">
                    <Hash className="w-4 h-4 mr-1" />
                    Hashtags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {generated.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        data-testid={`hashtag-${index}`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Suggested Image Prompt</Label>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-700" data-testid="image-prompt">
                      {generated.imagePrompt}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
