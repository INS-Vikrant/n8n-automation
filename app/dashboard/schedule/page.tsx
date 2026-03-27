'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Loader2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Post {
  id: string;
  content: string;
  platform: string;
  hashtags: string[];
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

export default function SchedulePage() {
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('twitter');
  const [hashtags, setHashtags] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [fetchingPosts, setFetchingPosts] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setFetchingPosts(false);
    }
  };

  const handleSchedule = async () => {
    if (!content.trim()) {
      toast.error('Please enter content');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select date and time');
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    setLoading(true);

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platform,
          hashtags: hashtags.split(',').map(h => h.trim()).filter(Boolean),
          scheduledAt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to schedule post');
      }

      toast.success('Post scheduled successfully!');
      setContent('');
      setHashtags('');
      setScheduledDate('');
      setScheduledTime('');
      fetchPosts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule post');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'published':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'scheduled':
        return `${baseClasses} bg-orange-100 text-orange-700`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  return (
    <div className="space-y-8" data-testid="schedule-page">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Schedule Posts</h1>
        <p className="text-gray-600">Plan and automate your social media content</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>New Scheduled Post</CardTitle>
              <CardDescription>Schedule your post for publishing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-schedule">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger id="platform-schedule" data-testid="schedule-platform-select">
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
                <Label htmlFor="content-schedule">Content</Label>
                <textarea
                  id="content-schedule"
                  className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Write your post content..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  data-testid="schedule-content-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hashtags-schedule">Hashtags (comma-separated)</Label>
                <Input
                  id="hashtags-schedule"
                  placeholder="AI, Marketing, Tech"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  data-testid="schedule-hashtags-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="schedule-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    data-testid="schedule-time-input"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSchedule}
                disabled={loading}
                data-testid="schedule-post-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Post
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Posts</CardTitle>
              <CardDescription>Manage your scheduled and published posts</CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingPosts ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No scheduled posts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                      data-testid={`post-${post.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(post.status)}
                          <span className={getStatusBadge(post.status)}>
                            {post.status}
                          </span>
                          <span className="text-sm text-gray-500 capitalize">
                            {post.platform}
                          </span>
                        </div>
                        {post.scheduledAt && (
                          <span className="text-xs text-gray-500">
                            {new Date(post.scheduledAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                        {post.content}
                      </p>
                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {post.hashtags.slice(0, 5).map((tag, idx) => (
                            <span key={idx} className="text-xs text-blue-600">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
