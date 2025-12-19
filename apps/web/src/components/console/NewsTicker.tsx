'use client';

/**
 * Enhanced NewsTicker Component
 *
 * Features:
 * - Smooth scrolling marquee animation
 * - Breaking news interruptions with dramatic effects
 * - Real-time item entry animations
 * - Sound effects for breaking news
 * - Priority queue system
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  AlertTriangle,
  Radio,
  Tv,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface NewsItem {
  id: string;
  content: string;
  breaking: boolean;
  timestamp: number;
  source?: 'radio' | 'tv' | 'newspaper' | 'official';
  priority?: number; // 1-5, higher = more urgent
}

export interface NewsTickerProps {
  items: NewsItem[];
  onNewsClick?: (item: NewsItem) => void;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  radio: <Radio className="h-3 w-3" />,
  tv: <Tv className="h-3 w-3" />,
  newspaper: <Newspaper className="h-3 w-3" />,
  official: <AlertTriangle className="h-3 w-3" />,
};

const DISPLAY_DURATION = 8000; // 8 seconds per item
const BREAKING_DURATION = 12000; // 12 seconds for breaking news
const TRANSITION_DURATION = 500; // 500ms transition

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NewsTicker({
  items,
  onNewsClick,
  autoPlay = true,
  showControls = true,
  className,
}: NewsTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBreaking, setIsBreaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasNewBreaking, setHasNewBreaking] = useState(false);
  const { play: playSound } = useSound();
  const lastBreakingIdRef = useRef<string | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Sort items: breaking first, then by timestamp
  const sortedItems = [...items]
    .filter((item) => item.content && item.content.length > 0)
    .sort((a, b) => {
      if (a.breaking && !b.breaking) return -1;
      if (!a.breaking && b.breaking) return 1;
      return b.timestamp - a.timestamp;
    });

  const currentItem = sortedItems[currentIndex];

  // Check for new breaking news
  useEffect(() => {
    const latestBreaking = sortedItems.find((item) => item.breaking);
    if (latestBreaking && latestBreaking.id !== lastBreakingIdRef.current) {
      lastBreakingIdRef.current = latestBreaking.id;
      setHasNewBreaking(true);
      setIsBreaking(true);
      setCurrentIndex(sortedItems.indexOf(latestBreaking));
      playSound('dramatic', 'breakingNews');

      // Reset breaking highlight after duration
      const timer = setTimeout(() => {
        setIsBreaking(false);
        setHasNewBreaking(false);
      }, BREAKING_DURATION);

      return () => clearTimeout(timer);
    }
  }, [sortedItems, playSound]);

  // Auto-rotate through items
  useEffect(() => {
    if (!autoPlay || isPaused || sortedItems.length <= 1) return;

    const duration = currentItem?.breaking ? BREAKING_DURATION : DISPLAY_DURATION;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sortedItems.length);
    }, duration);

    return () => clearInterval(interval);
  }, [autoPlay, isPaused, sortedItems.length, currentItem?.breaking]);

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? sortedItems.length - 1 : prev - 1
    );
    playSound('ui', 'click');
  }, [sortedItems.length, playSound]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sortedItems.length);
    playSound('ui', 'click');
  }, [sortedItems.length, playSound]);

  // Handle item click
  const handleItemClick = useCallback(() => {
    if (currentItem && onNewsClick) {
      onNewsClick(currentItem);
      playSound('ui', 'select');
    }
  }, [currentItem, onNewsClick, playSound]);

  // Empty state
  if (!currentItem) {
    return (
      <div
        className={cn(
          'bg-card border-t border-border px-4 py-2',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground animate-pulse" />
          <span className="text-sm text-muted-foreground">
            Monitoring news feeds...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={tickerRef}
      className={cn(
        'relative border-t overflow-hidden transition-colors duration-300',
        isBreaking
          ? 'bg-destructive/20 border-destructive'
          : 'bg-card border-border',
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Breaking news flash effect */}
      <AnimatePresence>
        {hasNewBreaking && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.5, 1, 0.5, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, times: [0, 0.2, 0.4, 0.6, 1] }}
            className="absolute inset-0 bg-destructive/30 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="px-4 py-2 flex items-center gap-3">
        {/* Breaking badge */}
        <AnimatePresence mode="wait">
          {currentItem.breaking && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-1 shrink-0"
            >
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="flex items-center gap-1 px-2 py-0.5 bg-destructive text-destructive-foreground rounded text-xs font-bold"
              >
                <AlertTriangle className="h-3 w-3" />
                BREAKING
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Source icon */}
        {!currentItem.breaking && currentItem.source && (
          <span className="text-muted-foreground shrink-0">
            {SOURCE_ICONS[currentItem.source] || <Newspaper className="h-3 w-3" />}
          </span>
        )}

        {/* News content with animation */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              onClick={handleItemClick}
              className={cn(
                'cursor-pointer hover:text-primary transition-colors',
                currentItem.breaking && 'font-semibold'
              )}
            >
              {/* Scrolling text for long content */}
              <div className="relative">
                <motion.p
                  className="text-sm whitespace-nowrap"
                  animate={
                    currentItem.content.length > 80
                      ? {
                          x: ['0%', '-50%'],
                        }
                      : {}
                  }
                  transition={
                    currentItem.content.length > 80
                      ? {
                          duration: currentItem.content.length * 0.15,
                          ease: 'linear',
                          repeat: Infinity,
                          repeatDelay: 2,
                        }
                      : {}
                  }
                >
                  {currentItem.content}
                  {currentItem.content.length > 80 && (
                    <span className="mx-16">•</span>
                  )}
                  {currentItem.content.length > 80 && currentItem.content}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls & indicators */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Item count indicators */}
          {sortedItems.length > 1 && (
            <div className="hidden sm:flex gap-1">
              {sortedItems.slice(0, 5).map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    playSound('ui', 'click');
                  }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    idx === currentIndex
                      ? item.breaking
                        ? 'bg-destructive scale-125'
                        : 'bg-primary scale-125'
                      : item.breaking
                      ? 'bg-destructive/50'
                      : 'bg-muted hover:bg-muted-foreground/50'
                  )}
                  aria-label={`News item ${idx + 1}`}
                />
              ))}
              {sortedItems.length > 5 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{sortedItems.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Navigation controls */}
          {showControls && sortedItems.length > 1 && (
            <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
              <button
                onClick={goToPrevious}
                className="p-1 hover:bg-muted rounded transition-colors"
                aria-label="Previous news"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToNext}
                className="p-1 hover:bg-muted rounded transition-colors"
                aria-label="Next news"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Pause indicator */}
          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground"
            >
              Paused
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <motion.div
        className={cn(
          'absolute bottom-0 left-0 h-0.5',
          currentItem.breaking ? 'bg-destructive' : 'bg-primary'
        )}
        initial={{ width: '0%' }}
        animate={{ width: isPaused ? undefined : '100%' }}
        transition={{
          duration: (currentItem.breaking ? BREAKING_DURATION : DISPLAY_DURATION) / 1000,
          ease: 'linear',
        }}
        key={`progress-${currentIndex}`}
      />
    </div>
  );
}

export default NewsTicker;
