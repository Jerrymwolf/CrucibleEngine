'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/dateUtils';

interface FeedItem {
  id: string;
  type: string;
  source: string;
  content: string;
  urgency: number;
  relatedParish: string;
  timestamp: number;
  breaking: boolean;
}

interface SocialFeedProps {
  items: FeedItem[];
  filter?: 'all' | 'social' | 'news' | 'radio' | 'weather' | 'official';
  className?: string;
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'social':
      return '💬';
    case 'news':
      return '📺';
    case 'radio':
      return '📻';
    case 'weather':
      return '🌀';
    case 'official':
      return '🏛️';
    default:
      return '📝';
  }
}

function getUrgencyColor(urgency: number): string {
  switch (urgency) {
    case 5:
      return 'border-l-status-critical';
    case 4:
      return 'border-l-status-danger';
    case 3:
      return 'border-l-status-warning';
    case 2:
      return 'border-l-primary';
    default:
      return 'border-l-muted';
  }
}

export function SocialFeed({ items, filter = 'all', className }: SocialFeedProps) {
  // Filter items
  const filteredItems =
    filter === 'all' ? items : items.filter((item) => item.type === filter);

  // Sort by timestamp descending (most recent first)
  const sortedItems = [...filteredItems].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <ScrollArea className={cn('h-[400px]', className)}>
      <div className="space-y-2 pr-4">
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'p-3 rounded-lg border-l-4 bg-muted/30',
              getUrgencyColor(item.urgency),
              item.breaking && 'bg-destructive/10 animate-pulse-slow'
            )}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{getTypeIcon(item.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold">{item.source}</span>
                  {item.relatedParish && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase">
                      {item.relatedParish}
                    </span>
                  )}
                  <span className="ml-auto">
                    {formatDistanceToNow(item.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{item.content}</p>
              </div>
            </div>
          </div>
        ))}

        {sortedItems.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No updates yet
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
