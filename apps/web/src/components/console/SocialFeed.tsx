'use client';

/**
 * Enhanced SocialFeed Component
 *
 * Features:
 * - Real-time item entry animations
 * - Filter tabs by source type
 * - Sound effects for breaking/urgent items
 * - Click to expand for long content
 * - Typing indicator for incoming items
 * - Urgency-based visual hierarchy
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { formatDistanceToNow } from '@/lib/dateUtils';
import {
  MessageCircle,
  Tv,
  Radio,
  CloudSun,
  Building2,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Bell,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface FeedItem {
  id: string;
  type: 'social' | 'news' | 'radio' | 'weather' | 'official';
  source: string;
  content: string;
  urgency: number; // 1-5, higher = more urgent
  relatedParish?: string;
  timestamp: number;
  breaking: boolean;
  avatar?: string;
}

export interface SocialFeedProps {
  items: FeedItem[];
  filter?: 'all' | FeedItem['type'];
  onFilterChange?: (filter: 'all' | FeedItem['type']) => void;
  onItemClick?: (item: FeedItem) => void;
  showFilters?: boolean;
  maxHeight?: string;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_CONFIG: Record<
  FeedItem['type'],
  { icon: React.ReactNode; label: string; color: string }
> = {
  social: {
    icon: <MessageCircle className="h-4 w-4" />,
    label: 'Social',
    color: 'text-blue-500',
  },
  news: {
    icon: <Tv className="h-4 w-4" />,
    label: 'News',
    color: 'text-purple-500',
  },
  radio: {
    icon: <Radio className="h-4 w-4" />,
    label: 'Radio',
    color: 'text-orange-500',
  },
  weather: {
    icon: <CloudSun className="h-4 w-4" />,
    label: 'Weather',
    color: 'text-cyan-500',
  },
  official: {
    icon: <Building2 className="h-4 w-4" />,
    label: 'Official',
    color: 'text-amber-500',
  },
};

const URGENCY_STYLES: Record<number, { border: string; bg: string; pulse?: boolean }> = {
  5: { border: 'border-l-red-500', bg: 'bg-red-500/10', pulse: true },
  4: { border: 'border-l-orange-500', bg: 'bg-orange-500/10' },
  3: { border: 'border-l-amber-500', bg: 'bg-amber-500/5' },
  2: { border: 'border-l-primary', bg: '' },
  1: { border: 'border-l-muted', bg: '' },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function FilterTabs({
  activeFilter,
  onFilterChange,
  itemCounts,
}: {
  activeFilter: 'all' | FeedItem['type'];
  onFilterChange: (filter: 'all' | FeedItem['type']) => void;
  itemCounts: Record<string, number>;
}) {
  const { play: playSound } = useSound();

  const filters: Array<{ value: 'all' | FeedItem['type']; label: string; icon?: React.ReactNode }> = [
    { value: 'all', label: 'All', icon: <Filter className="h-3 w-3" /> },
    ...Object.entries(TYPE_CONFIG).map(([key, config]) => ({
      value: key as FeedItem['type'],
      label: config.label,
      icon: config.icon,
    })),
  ];

  return (
    <div className="flex gap-1 p-1 bg-muted/30 rounded-lg overflow-x-auto">
      {filters.map((filter) => {
        const count = filter.value === 'all'
          ? Object.values(itemCounts).reduce((a, b) => a + b, 0)
          : itemCounts[filter.value] || 0;

        return (
          <button
            key={filter.value}
            onClick={() => {
              onFilterChange(filter.value);
              playSound('ui', 'click');
            }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
              activeFilter === filter.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            {filter.icon}
            <span className="hidden sm:inline">{filter.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  activeFilter === filter.value
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FeedItemCard({
  item,
  isNew,
  onExpand,
}: {
  item: FeedItem;
  isNew: boolean;
  onExpand?: (item: FeedItem) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = TYPE_CONFIG[item.type];
  const urgencyStyle = URGENCY_STYLES[item.urgency] || URGENCY_STYLES[1];
  const isLongContent = item.content.length > 150;

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'p-3 rounded-lg border-l-4 transition-colors cursor-pointer',
        urgencyStyle.border,
        urgencyStyle.bg || 'bg-muted/30',
        urgencyStyle.pulse && 'animate-pulse-slow',
        item.breaking && 'ring-1 ring-destructive/50'
      )}
      onClick={() => {
        if (isLongContent) {
          setIsExpanded(!isExpanded);
        }
        onExpand?.(item);
      }}
    >
      {/* Breaking badge */}
      {item.breaking && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1 mb-2"
        >
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded text-[10px] font-bold">
            <AlertTriangle className="h-2.5 w-2.5" />
            URGENT
          </span>
        </motion.div>
      )}

      <div className="flex items-start gap-2">
        {/* Avatar/Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            item.avatar ? '' : 'bg-muted',
            config.color
          )}
        >
          {item.avatar ? (
            <img
              src={item.avatar}
              alt={item.source}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            config.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="font-semibold truncate">{item.source}</span>
            {item.relatedParish && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase shrink-0">
                {item.relatedParish}
              </span>
            )}
            <span className="text-muted-foreground ml-auto shrink-0">
              {formatDistanceToNow(item.timestamp)}
            </span>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.p
              key={isExpanded ? 'expanded' : 'collapsed'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'text-sm',
                !isExpanded && isLongContent && 'line-clamp-2'
              )}
            >
              {item.content}
            </motion.p>
          </AnimatePresence>

          {/* Expand button */}
          {isLongContent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Read more
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 p-3 text-sm text-muted-foreground"
    >
      <div className="flex gap-1">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-muted-foreground rounded-full"
        />
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 bg-muted-foreground rounded-full"
        />
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 bg-muted-foreground rounded-full"
        />
      </div>
      <span>Incoming updates...</span>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SocialFeed({
  items,
  filter = 'all',
  onFilterChange,
  onItemClick,
  showFilters = true,
  maxHeight = '400px',
  className,
}: SocialFeedProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | FeedItem['type']>(filter);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [showTyping, setShowTyping] = useState(false);
  const { play: playSound } = useSound();
  const previousItemsRef = useRef<FeedItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track new items
  useEffect(() => {
    const previousIds = new Set(previousItemsRef.current.map((i) => i.id));
    const newIds = items
      .filter((item) => !previousIds.has(item.id))
      .map((item) => item.id);

    if (newIds.length > 0) {
      setNewItemIds(new Set(newIds));

      // Play sound for urgent items
      const urgentNew = items.find(
        (item) => newIds.includes(item.id) && item.urgency >= 4
      );
      if (urgentNew) {
        playSound('ui', 'notification');
      }

      // Clear new status after animation
      const timer = setTimeout(() => {
        setNewItemIds(new Set());
      }, 1000);

      return () => clearTimeout(timer);
    }

    previousItemsRef.current = items;
  }, [items, playSound]);

  // Simulate typing indicator occasionally
  useEffect(() => {
    const showIndicator = () => {
      setShowTyping(true);
      setTimeout(() => setShowTyping(false), 2000);
    };

    // Show typing indicator every 30-60 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        showIndicator();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback(
    (newFilter: 'all' | FeedItem['type']) => {
      setActiveFilter(newFilter);
      onFilterChange?.(newFilter);
    },
    [onFilterChange]
  );

  // Calculate item counts per type
  const itemCounts = items.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Filter and sort items
  const filteredItems =
    activeFilter === 'all'
      ? items
      : items.filter((item) => item.type === activeFilter);

  const sortedItems = [...filteredItems].sort((a, b) => {
    // Breaking items first
    if (a.breaking && !b.breaking) return -1;
    if (!a.breaking && b.breaking) return 1;
    // Then by timestamp (newest first)
    return b.timestamp - a.timestamp;
  });

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Filter tabs */}
      {showFilters && (
        <div className="mb-3">
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            itemCounts={itemCounts}
          />
        </div>
      )}

      {/* Feed content */}
      <ScrollArea
        ref={scrollRef}
        className={cn('pr-4')}
        style={{ height: maxHeight }}
      >
        <AnimatePresence mode="popLayout">
          {/* Typing indicator */}
          {showTyping && <TypingIndicator key="typing" />}

          {/* Feed items */}
          {sortedItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="mb-2"
            >
              <FeedItemCard
                item={item}
                isNew={newItemIds.has(item.id)}
                onExpand={onItemClick}
              />
            </motion.div>
          ))}

          {/* Empty state */}
          {sortedItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Bell className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {activeFilter === 'all'
                  ? 'No updates yet'
                  : `No ${TYPE_CONFIG[activeFilter as FeedItem['type']]?.label.toLowerCase()} updates`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* New items notification bar */}
      <AnimatePresence>
        {newItemIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded-lg text-center"
          >
            <span className="text-xs text-primary font-medium">
              {newItemIds.size} new update{newItemIds.size > 1 ? 's' : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SocialFeed;
