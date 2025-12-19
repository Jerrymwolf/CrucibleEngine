'use client';

/**
 * Spectator Mode Page
 *
 * View-only interface for observers to watch the simulation without participating.
 * Useful for training sessions, observers, or delayed playback for debriefs.
 *
 * Features:
 * - View-only access to all public state
 * - No decision input capability
 * - Optional delayed feed (for training)
 * - Note-taking sidebar
 * - Timestamp bookmarks
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useColyseus } from '@/hooks/useColyseus';
import { useGameStore } from '@/stores/gameStore';
import { PARISHES } from '@crucible/shared';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Users,
  Clock,
  CloudLightning,
  Radio,
  Bookmark,
  BookmarkPlus,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Timer,
  Zap,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/Logo';

// ============================================================================
// TYPES
// ============================================================================

interface Bookmark {
  id: string;
  timestamp: number;
  simulationTime: number;
  label: string;
  note?: string;
}

interface Note {
  id: string;
  timestamp: number;
  simulationTime: number;
  content: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SpectatorBanner() {
  return (
    <div className="bg-primary/20 border-b border-primary/30 px-4 py-2">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm text-primary">
        <Eye className="h-4 w-4" />
        <span className="font-medium">Spectator Mode</span>
        <span className="text-primary/70">- View only, no participation</span>
      </div>
    </div>
  );
}

function TeamOverviewCard({
  team,
  parish,
  parishState,
}: {
  team: { id: string; teamName: string; members: { name: string; connected: boolean }[]; ready: boolean };
  parish: (typeof PARISHES)[keyof typeof PARISHES];
  parishState?: { status: { power: number; communications: number }; morale: number };
}) {
  const connectedCount = team.members.filter((m) => m.connected).length;

  return (
    <div className="p-3 rounded-lg border border-border bg-card/50">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-sm">{parish.name}</h3>
          <p className="text-xs text-muted-foreground">{team.teamName}</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Users className="h-3 w-3" />
          <span>{connectedCount}/{team.members.length}</span>
        </div>
      </div>

      {parishState && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Power</span>
            <div className="font-mono">{parishState.status.power}%</div>
          </div>
          <div>
            <span className="text-muted-foreground">Comms</span>
            <div className="font-mono">{parishState.status.communications}%</div>
          </div>
          <div>
            <span className="text-muted-foreground">Morale</span>
            <div className="font-mono">{parishState.morale}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookmarkList({
  bookmarks,
  onRemove,
}: {
  bookmarks: Bookmark[];
  onRemove: (id: string) => void;
}) {
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Bookmark className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p>No bookmarks yet</p>
        <p className="text-xs">Click the bookmark button to mark moments</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="flex items-start gap-2 p-2 rounded bg-muted/30 group"
        >
          <Bookmark className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                T+{bookmark.simulationTime}m
              </span>
              <span className="text-sm font-medium truncate">{bookmark.label}</span>
            </div>
            {bookmark.note && (
              <p className="text-xs text-muted-foreground mt-1">{bookmark.note}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(bookmark.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

function NotesList({
  notes,
  onRemove,
}: {
  notes: Note[];
  onRemove: (id: string) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <StickyNote className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p>No notes yet</p>
        <p className="text-xs">Add observations during the simulation</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div
          key={note.id}
          className="p-2 rounded bg-amber-500/10 border border-amber-500/20 group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              T+{note.simulationTime}m
            </span>
            <button
              type="button"
              onClick={() => onRemove(note.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              &times;
            </button>
          </div>
          <p className="text-sm">{note.content}</p>
        </div>
      ))}
    </div>
  );
}

function DelayControl({
  delay,
  onDelayChange,
}: {
  delay: number;
  onDelayChange: (delay: number) => void;
}) {
  const delays = [
    { value: 0, label: 'Live' },
    { value: 60, label: '1 min' },
    { value: 300, label: '5 min' },
    { value: 600, label: '10 min' },
  ];

  return (
    <div className="flex items-center gap-2">
      <Timer className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Feed delay:</span>
      <div className="flex gap-1">
        {delays.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => onDelayChange(d.value)}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              delay === d.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 hover:bg-muted'
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SpectatorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code as string;
  const spectatorName = searchParams.get('name') || 'Observer';

  const {
    connected,
    connecting,
    error,
    state,
  } = useColyseus({
    sessionCode: code,
    role: 'team', // Spectators connect as team role (read-only)
    participantName: spectatorName,
  });

  // Local state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [feedDelay, setFeedDelay] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'notes' | 'bookmarks'>('notes');

  const { updateFromSnapshot } = useGameStore();

  // Update store when state changes
  useEffect(() => {
    if (state) {
      updateFromSnapshot(state);
    }
  }, [state, updateFromSnapshot]);

  // Derived values
  const currentPhase = state?.phase.current || 'lobby';
  const isPaused = state?.phase.paused || false;
  const simulationTime = state?.simulationTime || 0;
  const teamsArray = useMemo(() => {
    if (!state?.teams) return [];
    return Array.from(state.teams.values());
  }, [state?.teams]);

  // Delayed feed items
  const displayedFeedItems = useMemo(() => {
    if (!state?.feed) return [];
    if (feedDelay === 0) return state.feed;

    const delayMs = feedDelay * 1000;
    const cutoff = Date.now() - delayMs;
    return state.feed.filter((item) => (item.timestamp || 0) < cutoff);
  }, [state?.feed, feedDelay]);

  // Handlers
  const handleAddBookmark = useCallback(() => {
    const bookmark: Bookmark = {
      id: `bookmark-${Date.now()}`,
      timestamp: Date.now(),
      simulationTime,
      label: `${currentPhase} - T+${simulationTime}m`,
    };
    setBookmarks((prev) => [...prev, bookmark]);
  }, [simulationTime, currentPhase]);

  const handleRemoveBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleAddNote = useCallback(() => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: `note-${Date.now()}`,
      timestamp: Date.now(),
      simulationTime,
      content: newNote.trim(),
    };
    setNotes((prev) => [...prev, note]);
    setNewNote('');
  }, [newNote, simulationTime]);

  const handleRemoveNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Loading state
  if (connecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <Logo variant="icon" size="lg" linkToHome={false} />
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-muted-foreground">Connecting as spectator...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Connection Error</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={() => router.push('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  // Count participants
  let totalParticipants = 0;
  state?.teams.forEach((team) => {
    totalParticipants += team.members.length;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Spectator Banner */}
      <SpectatorBanner />

      {/* Header Bar */}
      <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="icon" size="sm" priority={true} />
            <span className="font-semibold">Spectator View</span>
            <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">
              {code}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Phase & Time */}
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-muted rounded text-xs font-medium uppercase">
                {currentPhase}
              </span>
              <span className="text-muted-foreground">T+{simulationTime} min</span>
              {isPaused && (
                <span className="px-2 py-1 bg-amber-500/20 text-amber-500 rounded text-xs">
                  Paused
                </span>
              )}
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  connected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
                )}
              />
              {connected ? 'Connected' : 'Reconnecting'}
            </div>

            {/* Toggle Sidebar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar((prev) => !prev)}
            >
              {showSidebar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main View */}
        <div className="flex-1 overflow-auto p-4">
          <div className="container mx-auto space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="panel p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Participants</span>
                </div>
                <div className="text-2xl font-bold">{totalParticipants}</div>
              </div>

              <div className="panel p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm">Teams</span>
                </div>
                <div className="text-2xl font-bold">{teamsArray.length}</div>
              </div>

              <div className="panel p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CloudLightning className="h-4 w-4" />
                  <span className="text-sm">Hurricane</span>
                </div>
                <div className="text-2xl font-bold">
                  Cat {state?.weather.hurricane.category || '-'}
                </div>
              </div>

              <div className="panel p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Hours to Impact</span>
                </div>
                <div className="text-2xl font-bold">
                  {state?.weather.hurricane.hoursToImpact === -1
                    ? '?'
                    : state?.weather.hurricane.hoursToImpact}
                </div>
              </div>
            </div>

            {/* Teams Grid */}
            <div className="panel">
              <h2 className="panel-header">Teams Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.values(PARISHES).map((parish) => {
                  const team = state?.teams.get(parish.id);
                  const parishState = state?.parishes.get(parish.id);

                  if (!team) {
                    return (
                      <div
                        key={parish.id}
                        className="p-3 rounded-lg border border-dashed border-muted opacity-50"
                      >
                        <h3 className="font-semibold text-sm">{parish.name}</h3>
                        <p className="text-xs text-muted-foreground">No team assigned</p>
                      </div>
                    );
                  }

                  // Transform team.members from string[] to expected object format
                  const transformedTeam = {
                    id: team.id,
                    teamName: team.teamName || parish.name,
                    members: team.members.map((memberName: string) => ({
                      name: memberName,
                      connected: true, // Assume connected since we're viewing live
                    })),
                    ready: team.ready,
                  };

                  return (
                    <TeamOverviewCard
                      key={parish.id}
                      team={transformedTeam}
                      parish={parish}
                      parishState={parishState}
                    />
                  );
                })}
              </div>
            </div>

            {/* Feed */}
            <div className="panel">
              <div className="flex items-center justify-between mb-4">
                <h2 className="panel-header mb-0">Live Feed</h2>
                <DelayControl delay={feedDelay} onDelayChange={setFeedDelay} />
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {displayedFeedItems
                    .slice(-30)
                    .reverse()
                    .map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'text-xs p-2 rounded',
                          item.breaking
                            ? 'bg-destructive/20 border border-destructive'
                            : 'bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="uppercase">{item.type}</span>
                          <span>{item.source}</span>
                          {item.breaking && (
                            <span className="px-1 py-0.5 bg-destructive text-destructive-foreground rounded text-xs">
                              BREAKING
                            </span>
                          )}
                        </div>
                        <p className="mt-1">{item.content}</p>
                      </div>
                    ))}
                  {displayedFeedItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No feed items yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              <div className="w-80 h-full flex flex-col">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={sidebarTab === 'notes' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSidebarTab('notes')}
                    >
                      <StickyNote className="h-4 w-4 mr-1" />
                      Notes
                    </Button>
                    <Button
                      variant={sidebarTab === 'bookmarks' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSidebarTab('bookmarks')}
                    >
                      <Bookmark className="h-4 w-4 mr-1" />
                      Bookmarks
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-4 border-b border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddBookmark}
                  >
                    <BookmarkPlus className="h-4 w-4 mr-2" />
                    Bookmark This Moment
                  </Button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-auto p-4">
                  {sidebarTab === 'notes' ? (
                    <div className="space-y-4">
                      {/* Add Note Form */}
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add observation..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={3}
                        />
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={handleAddNote}
                          disabled={!newNote.trim()}
                        >
                          Add Note
                        </Button>
                      </div>

                      {/* Notes List */}
                      <NotesList notes={notes} onRemove={handleRemoveNote} />
                    </div>
                  ) : (
                    <BookmarkList bookmarks={bookmarks} onRemove={handleRemoveBookmark} />
                  )}
                </div>

                {/* Export */}
                <div className="p-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const data = {
                        sessionCode: code,
                        exportedAt: new Date().toISOString(),
                        simulationTime,
                        notes,
                        bookmarks,
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `spectator-notes-${code}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export Notes & Bookmarks
                  </Button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
