'use client';

/**
 * NarrativeQueue Component
 *
 * Feed management panel for facilitators to view, approve, and inject
 * narrative content into the simulation.
 *
 * Features:
 * - Live feed preview with filtering
 * - Pending narrative items for approval
 * - Quick inject for custom messages
 * - Breaking news toggle
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Newspaper,
  MessageSquare,
  Radio,
  AlertTriangle,
  Send,
  Check,
  X,
  Filter,
  Zap,
  Clock,
  Plus,
  ChevronDown,
  Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================================
// TYPES
// ============================================================================

export type FeedItemType = 'news' | 'social' | 'emergency' | 'radio' | 'directive';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  source: string;
  content: string;
  timestamp: number;
  breaking?: boolean;
  targetTeams?: string[];
  approved?: boolean;
  pending?: boolean;
}

export interface NarrativeQueueProps {
  feedItems: FeedItem[];
  pendingItems: FeedItem[];
  onApprove: (itemId: string) => void;
  onReject: (itemId: string) => void;
  onInject: (item: Omit<FeedItem, 'id' | 'timestamp' | 'approved'>) => void;
  teams: { id: string; name: string }[];
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEED_TYPES: {
  id: FeedItemType;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  {
    id: 'news',
    label: 'News',
    icon: Newspaper,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'social',
    label: 'Social',
    icon: MessageSquare,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    id: 'radio',
    label: 'Radio',
    icon: Radio,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'directive',
    label: 'Directive',
    icon: Megaphone,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
];

const DEFAULT_SOURCES: Record<FeedItemType, string[]> = {
  news: ['Concordia Daily', 'Island News Network', 'Weather Channel'],
  social: ['@ConcordiaResident', '@PortWorker', '@LocalMom'],
  emergency: ['Emergency Management', 'Fire Dept', 'Police Dept'],
  radio: ['WCOR 94.5', 'Emergency Broadcast', 'Ham Radio'],
  directive: ['Crucible Master', 'Session Control'],
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function FeedItemCard({
  item,
  onApprove,
  onReject,
  showActions = false,
}: {
  item: FeedItem;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}) {
  const { play: playSound } = useSound();
  const type = FEED_TYPES.find((t) => t.id === item.type);
  const Icon = type?.icon || Newspaper;
  const timeAgo = Math.floor((Date.now() - item.timestamp) / 1000 / 60);

  const handleApprove = () => {
    playSound('ui', 'success');
    onApprove?.();
  };

  const handleReject = () => {
    playSound('ui', 'click');
    onReject?.();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'p-3 rounded-lg border',
        item.breaking
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-muted/20 border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1 rounded', type?.bg)}>
          <Icon className={cn('h-3 w-3', type?.color)} />
        </div>
        <span className="text-xs font-medium uppercase">{item.type}</span>
        <span className="text-xs text-muted-foreground">
          {item.source}
        </span>
        {item.breaking && (
          <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">
            BREAKING
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {timeAgo < 1 ? 'Now' : `${timeAgo}m`}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm">{item.content}</p>

      {/* Target Teams */}
      {item.targetTeams && item.targetTeams.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs text-muted-foreground">To:</span>
          {item.targetTeams.map((team) => (
            <span
              key={team}
              className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded"
            >
              {team}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleApprove}
            className="flex-1 text-green-500 hover:text-green-600 hover:bg-green-500/10"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReject}
            className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function InjectForm({
  teams,
  onInject,
}: {
  teams: { id: string; name: string }[];
  onInject: (item: Omit<FeedItem, 'id' | 'timestamp' | 'approved'>) => void;
}) {
  const { play: playSound } = useSound();
  const [type, setType] = useState<FeedItemType>('news');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [targetAll, setTargetAll] = useState(true);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;

    playSound('dramatic', 'breakingNews');
    onInject({
      type,
      source: source || DEFAULT_SOURCES[type][0] || 'Unknown',
      content: content.trim(),
      breaking: isBreaking,
      targetTeams: targetAll ? undefined : selectedTeams,
    });

    // Reset form
    setContent('');
    setIsBreaking(false);
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="font-medium text-sm">Inject Narrative</span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
              {/* Type Selection */}
              <div className="grid grid-cols-5 gap-1">
                {FEED_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setType(t.id);
                      playSound('ui', 'click');
                    }}
                    className={cn(
                      'p-2 rounded text-center transition-all',
                      type === t.id
                        ? `${t.bg} border border-${t.color.replace('text-', '')}/40`
                        : 'hover:bg-muted/50 border border-transparent'
                    )}
                  >
                    <t.icon className={cn('h-4 w-4 mx-auto', t.color)} />
                    <span className="text-xs mt-1 block">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Source */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Source
                </label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_SOURCES[type].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {source === 'custom' && (
                  <Input
                    placeholder="Enter custom source..."
                    className="mt-2 h-9"
                    onChange={(e) => setSource(e.target.value)}
                  />
                )}
              </div>

              {/* Content */}
              <Textarea
                placeholder="Enter message content..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />

              {/* Breaking Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  <label htmlFor="breaking" className="text-sm">
                    Breaking News
                  </label>
                </div>
                <Switch
                  id="breaking"
                  checked={isBreaking}
                  onCheckedChange={setIsBreaking}
                />
              </div>

              {/* Target Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Target</label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="targetAll"
                      checked={targetAll}
                      onCheckedChange={setTargetAll}
                    />
                    <label htmlFor="targetAll" className="text-xs text-muted-foreground">
                      All Teams
                    </label>
                  </div>
                </div>

                {!targetAll && (
                  <div className="flex flex-wrap gap-1">
                    {teams.map((team) => (
                      <Button
                        key={team.id}
                        size="sm"
                        variant={selectedTeams.includes(team.id) ? 'default' : 'outline'}
                        onClick={() => toggleTeam(team.id)}
                      >
                        {team.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!content.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Feed
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NarrativeQueue({
  feedItems,
  pendingItems,
  onApprove,
  onReject,
  onInject,
  teams,
  className,
}: NarrativeQueueProps) {
  const { play: playSound } = useSound();
  const [filter, setFilter] = useState<FeedItemType | 'all'>('all');
  const [showPending, setShowPending] = useState(true);

  const filteredItems = useMemo(() => {
    let items = [...feedItems];
    if (filter !== 'all') {
      items = items.filter((item) => item.type === filter);
    }
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  }, [feedItems, filter]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Narrative Feed</span>
        </div>
        {pendingItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPending((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-500 rounded text-xs"
          >
            <Clock className="h-3 w-3" />
            {pendingItems.length} pending
          </button>
        )}
      </div>

      {/* Pending Items */}
      <AnimatePresence>
        {showPending && pendingItems.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
              <Clock className="h-4 w-4" />
              Pending Approval
            </div>
            {pendingItems.map((item) => (
              <FeedItemCard
                key={item.id}
                item={item}
                showActions
                onApprove={() => onApprove(item.id)}
                onReject={() => onReject(item.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inject Form */}
      <InjectForm teams={teams} onInject={onInject} />

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilter('all')}
            className="h-7 text-xs"
          >
            All
          </Button>
          {FEED_TYPES.map((type) => (
            <Button
              key={type.id}
              size="sm"
              variant={filter === type.id ? 'default' : 'ghost'}
              onClick={() => setFilter(type.id)}
              className="h-7 text-xs"
            >
              <type.icon className={cn('h-3 w-3 mr-1', type.color)} />
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Feed List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-3">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <FeedItemCard key={item.id} item={item} />
            ))}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No feed items yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default NarrativeQueue;
