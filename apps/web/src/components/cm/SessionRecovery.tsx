'use client';

/**
 * SessionRecovery Component
 *
 * Handles connection states and recovery for CM sessions.
 * Provides clear UX for disconnect, reconnect, and session transfer scenarios.
 *
 * Features:
 * - Connection status indicator
 * - Auto-reconnection with progress
 * - Manual reconnection option
 * - Session transfer capability
 * - Graceful degradation states
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LogOut,
  UserPlus,
  Shield,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface SessionRecoveryProps {
  status: ConnectionStatus;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  lastConnectedTime?: number;
  sessionCode: string;
  onReconnect: () => void;
  onTransfer: (newCmName: string) => void;
  onExit: () => void;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: {
      icon: Wifi,
      color: 'text-green-500',
      bg: 'bg-green-500',
      label: 'Connected',
    },
    connecting: {
      icon: Loader2,
      color: 'text-blue-500',
      bg: 'bg-blue-500',
      label: 'Connecting...',
      animate: true,
    },
    reconnecting: {
      icon: RefreshCw,
      color: 'text-amber-500',
      bg: 'bg-amber-500',
      label: 'Reconnecting...',
      animate: true,
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-500',
      bg: 'bg-red-500',
      label: 'Disconnected',
    },
    failed: {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500',
      label: 'Connection Failed',
    },
  };

  const { icon: Icon, color, bg, label, animate } = config[status] as {
    icon: React.ElementType;
    color: string;
    bg: string;
    label: string;
    animate?: boolean;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping',
            status === 'connected' ? bg : 'bg-transparent',
            'opacity-30'
          )}
        />
        <Icon
          className={cn(
            'h-4 w-4 relative',
            color,
            animate && 'animate-spin'
          )}
        />
      </div>
      <span className={cn('text-sm', color)}>{label}</span>
    </div>
  );
}

function ReconnectProgress({
  attempt,
  maxAttempts,
}: {
  attempt: number;
  maxAttempts: number;
}) {
  const progress = (attempt / maxAttempts) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Reconnection attempt</span>
        <span className="font-mono">
          {attempt}/{maxAttempts}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-amber-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

function TransferControl({
  onTransfer,
}: {
  onTransfer: (name: string) => void;
}) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [newCmName, setNewCmName] = useState('');
  const { play: playSound } = useSound();

  const handleTransfer = () => {
    if (!newCmName.trim()) return;
    playSound('ui', 'success');
    onTransfer(newCmName.trim());
    setShowTransfer(false);
    setNewCmName('');
  };

  return (
    <div className="space-y-2">
      {!showTransfer ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTransfer(true)}
          className="w-full"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Transfer Control
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <Input
            placeholder="New CM name..."
            value={newCmName}
            onChange={(e) => setNewCmName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransfer(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTransfer}
              disabled={!newCmName.trim()}
              className="flex-1"
            >
              Confirm
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SessionRecovery({
  status,
  reconnectAttempt,
  maxReconnectAttempts,
  lastConnectedTime,
  sessionCode,
  onReconnect,
  onTransfer,
  onExit,
  className,
}: SessionRecoveryProps) {
  const { play: playSound } = useSound();
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);

  // Auto-show panel on disconnect
  useEffect(() => {
    if (status === 'disconnected' || status === 'failed') {
      setShowRecoveryPanel(true);
      playSound('ui', 'error');
    } else if (status === 'connected') {
      setShowRecoveryPanel(false);
    }
  }, [status, playSound]);

  const timeSinceDisconnect = lastConnectedTime
    ? Math.floor((Date.now() - lastConnectedTime) / 1000)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If connected, show minimal indicator
  if (status === 'connected') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <ConnectionIndicator status={status} />
      </div>
    );
  }

  return (
    <>
      {/* Status Bar Indicator */}
      <button
        type="button"
        onClick={() => setShowRecoveryPanel((prev) => !prev)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
          status === 'reconnecting' && 'bg-amber-500/20 hover:bg-amber-500/30',
          (status === 'disconnected' || status === 'failed') &&
            'bg-red-500/20 hover:bg-red-500/30',
          status === 'connecting' && 'bg-blue-500/20 hover:bg-blue-500/30',
          className
        )}
      >
        <ConnectionIndicator status={status} />
      </button>

      {/* Full Recovery Panel */}
      <AnimatePresence>
        {showRecoveryPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => status === 'reconnecting' && setShowRecoveryPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="panel max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                {status === 'reconnecting' ? (
                  <div className="p-3 bg-amber-500/20 rounded-full">
                    <RefreshCw className="h-6 w-6 text-amber-500 animate-spin" />
                  </div>
                ) : status === 'failed' ? (
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                ) : (
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <WifiOff className="h-6 w-6 text-red-500" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold">
                    {status === 'reconnecting'
                      ? 'Reconnecting to Session'
                      : status === 'failed'
                        ? 'Connection Failed'
                        : 'Connection Lost'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Session: {sessionCode}
                  </p>
                </div>
              </div>

              {/* Reconnecting State */}
              {status === 'reconnecting' && (
                <div className="space-y-4 mb-6">
                  <ReconnectProgress
                    attempt={reconnectAttempt}
                    maxAttempts={maxReconnectAttempts}
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    The simulation is paused while you reconnect.
                    Teams are waiting.
                  </p>
                </div>
              )}

              {/* Disconnected/Failed State */}
              {(status === 'disconnected' || status === 'failed') && (
                <div className="space-y-4 mb-6">
                  {timeSinceDisconnect > 0 && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Disconnected for {formatTime(timeSinceDisconnect)}</span>
                    </div>
                  )}

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Session Protected
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Simulation is auto-paused</li>
                      <li>• All team progress is saved</li>
                      <li>• Participants see "Facilitator reconnecting..."</li>
                    </ul>
                  </div>

                  {status === 'failed' && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Unable to reconnect automatically. Please try manually.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {(status === 'disconnected' || status === 'failed') && (
                  <Button className="w-full" onClick={onReconnect}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconnect Now
                  </Button>
                )}

                <TransferControl onTransfer={onTransfer} />

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={onExit}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit Session
                </Button>
              </div>

              {/* Close button for reconnecting state */}
              {status === 'reconnecting' && (
                <button
                  type="button"
                  onClick={() => setShowRecoveryPanel(false)}
                  className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                >
                  Hide this panel (reconnecting in background)
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SessionRecovery;
