'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface NewsItem {
  id: string;
  content: string;
  breaking: boolean;
  timestamp: number;
}

interface NewsTickerProps {
  items: NewsItem[];
  className?: string;
}

export function NewsTicker({ items, className }: NewsTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Filter to news items only and get the most recent
  const newsItems = items.filter(
    (item) => item.content && item.content.length > 0
  );

  // Auto-rotate through items
  useEffect(() => {
    if (newsItems.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsItems.length);
    }, 8000); // 8 seconds per item

    return () => clearInterval(interval);
  }, [newsItems.length]);

  const currentItem = newsItems[currentIndex];

  if (!currentItem) {
    return (
      <div className={cn('bg-card border-b border-border px-4 py-2', className)}>
        <span className="text-sm text-muted-foreground">
          Awaiting news updates...
        </span>
      </div>
    );
  }

  return (
    <div
      ref={tickerRef}
      className={cn(
        'border-b overflow-hidden',
        currentItem.breaking
          ? 'bg-destructive/20 border-destructive animate-breaking-flash'
          : 'bg-card border-border',
        className
      )}
    >
      <div className="px-4 py-2 flex items-center gap-3">
        {currentItem.breaking && (
          <span className="flex items-center gap-1 text-destructive font-bold text-sm shrink-0">
            <AlertTriangle className="h-4 w-4" />
            BREAKING
          </span>
        )}

        <div className="flex-1 overflow-hidden">
          <p
            className={cn(
              'text-sm truncate',
              currentItem.breaking && 'font-semibold'
            )}
          >
            {currentItem.content}
          </p>
        </div>

        {newsItems.length > 1 && (
          <div className="flex gap-1 shrink-0">
            {newsItems.slice(0, 5).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  idx === currentIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
