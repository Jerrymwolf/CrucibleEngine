'use client';

/**
 * AlertSystem Component
 *
 * Multi-level alert system for crisis events:
 * - Critical: Full-screen takeover with dramatic animation
 * - Warning: Top banner with auto-dismiss
 * - Info: Toast notification in corner
 *
 * Features:
 * - Sound effects per alert level
 * - Screen shake for critical alerts
 * - Queue system for multiple alerts
 * - Dismiss controls
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Bell,
  Siren,
  ShieldAlert,
  Radio,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export type AlertLevel = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  source?: string;
  duration?: number; // ms, 0 = manual dismiss only
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export interface AlertSystemProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  maxToasts?: number;
  className?: string;
}

interface AlertContextValue {
  addAlert: (alert: Omit<Alert, 'id'>) => string;
  dismissAlert: (id: string) => void;
  clearAll: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_CONFIG: Record<
  AlertLevel,
  {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    sound: string;
  }
> = {
  critical: {
    icon: <Siren className="h-6 w-6" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    sound: 'criticalAlert',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500',
    sound: 'notification',
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    sound: 'notification',
  },
};

const DEFAULT_DURATIONS: Record<AlertLevel, number> = {
  critical: 0, // Manual dismiss only
  warning: 10000, // 10 seconds
  info: 5000, // 5 seconds
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function CriticalAlert({
  alert,
  onDismiss,
}: {
  alert: Alert;
  onDismiss: () => void;
}) {
  const { play: playSound } = useSound();
  const config = LEVEL_CONFIG.critical;

  useEffect(() => {
    playSound('dramatic', 'criticalAlert');

    // Add screen shake effect
    document.body.classList.add('animate-shake');
    const timer = setTimeout(() => {
      document.body.classList.remove('animate-shake');
    }, 500);

    return () => {
      document.body.classList.remove('animate-shake');
      clearTimeout(timer);
    };
  }, [playSound]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop with flash effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.9, 0.7],
          backgroundColor: ['rgba(0,0,0,0)', 'rgba(127,29,29,0.3)', 'rgba(0,0,0,0.9)'],
        }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 backdrop-blur-md"
        onClick={onDismiss}
      />

      {/* Alert content */}
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'relative z-10 max-w-lg w-full p-8 rounded-2xl border-2',
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Pulsing border glow */}
        <motion.div
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(239, 68, 68, 0)',
              '0 0 30px 10px rgba(239, 68, 68, 0.3)',
              '0 0 0 0 rgba(239, 68, 68, 0)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
        />

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-background/20 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className={cn('mb-6', config.color)}
        >
          {config.icon}
        </motion.div>

        {/* Source badge */}
        {alert.source && (
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">
              {alert.source}
            </span>
          </div>
        )}

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold mb-4"
        >
          {alert.title}
        </motion.h2>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-muted-foreground mb-8"
        >
          {alert.message}
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3"
        >
          {alert.onAction && alert.actionLabel && (
            <Button
              onClick={() => {
                alert.onAction?.();
                onDismiss();
              }}
              variant="destructive"
              size="lg"
              className="flex-1"
            >
              {alert.actionLabel}
            </Button>
          )}
          <Button
            onClick={onDismiss}
            variant="outline"
            size="lg"
            className={alert.onAction ? '' : 'flex-1'}
          >
            Acknowledge
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function WarningBanner({
  alert,
  onDismiss,
}: {
  alert: Alert;
  onDismiss: () => void;
}) {
  const { play: playSound } = useSound();
  const config = LEVEL_CONFIG.warning;
  const duration = alert.duration ?? DEFAULT_DURATIONS.warning;

  useEffect(() => {
    playSound('ui', 'notification');

    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [playSound, duration, onDismiss]);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 p-4 border-b-2',
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
          className={config.color}
        >
          {config.icon}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold">{alert.title}</span>
            {alert.source && (
              <span className="text-xs text-muted-foreground">
                via {alert.source}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {alert.message}
          </p>
        </div>

        {/* Actions */}
        {alert.onAction && alert.actionLabel && (
          <Button
            onClick={() => {
              alert.onAction?.();
              onDismiss();
            }}
            variant="outline"
            size="sm"
            className={cn('shrink-0', config.color)}
          >
            {alert.actionLabel}
          </Button>
        )}

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-full hover:bg-background/20 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar for auto-dismiss */}
      {duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={cn('absolute bottom-0 left-0 h-0.5', config.borderColor.replace('border-', 'bg-'))}
        />
      )}
    </motion.div>
  );
}

function InfoToast({
  alert,
  onDismiss,
  index,
}: {
  alert: Alert;
  onDismiss: () => void;
  index: number;
}) {
  const config = LEVEL_CONFIG.info;
  const duration = alert.duration ?? DEFAULT_DURATIONS.info;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ bottom: `${(index * 80) + 16}px` }}
      className={cn(
        'fixed right-4 z-40 max-w-sm w-full p-4 rounded-lg border shadow-lg',
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('shrink-0 mt-0.5', config.color)}>{config.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">{alert.title}</span>
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-background/20 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>

          {/* Action */}
          {alert.onAction && alert.actionLabel && (
            <button
              onClick={() => {
                alert.onAction?.();
                onDismiss();
              }}
              className={cn(
                'mt-2 text-xs font-medium hover:underline',
                config.color
              )}
            >
              {alert.actionLabel}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={cn(
            'absolute bottom-0 left-0 h-0.5 rounded-b-lg',
            config.borderColor.replace('border-', 'bg-')
          )}
        />
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertSystem({
  alerts,
  onDismiss,
  maxToasts = 3,
  className,
}: AlertSystemProps) {
  // Separate alerts by level
  const criticalAlerts = alerts.filter((a) => a.level === 'critical');
  const warningAlerts = alerts.filter((a) => a.level === 'warning');
  const infoAlerts = alerts.filter((a) => a.level === 'info').slice(0, maxToasts);

  // Show only the first critical alert (full-screen takeover)
  const currentCritical = criticalAlerts[0];

  // Show only the first warning as a banner
  const currentWarning = warningAlerts[0];

  return (
    <div className={className}>
      {/* Critical alerts - full screen */}
      <AnimatePresence>
        {currentCritical && (
          <CriticalAlert
            key={currentCritical.id}
            alert={currentCritical}
            onDismiss={() => onDismiss(currentCritical.id)}
          />
        )}
      </AnimatePresence>

      {/* Warning alerts - top banner */}
      <AnimatePresence>
        {currentWarning && !currentCritical && (
          <WarningBanner
            key={currentWarning.id}
            alert={currentWarning}
            onDismiss={() => onDismiss(currentWarning.id)}
          />
        )}
      </AnimatePresence>

      {/* Info alerts - toast stack */}
      <AnimatePresence>
        {!currentCritical &&
          infoAlerts.map((alert, index) => (
            <InfoToast
              key={alert.id}
              alert={alert}
              onDismiss={() => onDismiss(alert.id)}
              index={index}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// PROVIDER
// ============================================================================

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setAlerts((prev) => [...prev, { ...alert, id }]);
    return id;
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const alert = prev.find((a) => a.id === id);
      if (alert?.onDismiss) {
        alert.onDismiss();
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setAlerts([]);
  }, []);

  return (
    <AlertContext.Provider value={{ addAlert, dismissAlert, clearAll }}>
      {children}
      <AlertSystem alerts={alerts} onDismiss={dismissAlert} />
    </AlertContext.Provider>
  );
}

export default AlertSystem;
