'use client';

/**
 * AssetPreloader - Loading screen for island assets
 *
 * Displays a professional loading UI while island sprites and sounds
 * are being loaded. Uses the islandAssets loader and provides
 * visual feedback on loading progress.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { preloadCriticalAssets } from '@/lib/island/assets';
import { Loader2, CheckCircle, AlertCircle, Map, Building2, Users, Sparkles } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface AssetPreloaderProps {
  /** Callback when loading completes */
  onComplete?: () => void;
  /** Callback on loading error */
  onError?: (error: Error) => void;
  /** Whether to auto-start loading */
  autoStart?: boolean;
  /** Minimum display time (ms) to prevent flash */
  minDisplayTime?: number;
  /** Children to render after loading completes */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

interface LoadingStage {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'loading' | 'complete' | 'error';
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AssetPreloader({
  onComplete,
  onError,
  autoStart = true,
  minDisplayTime = 500,
  children,
  className,
}: AssetPreloaderProps) {
  const [isLoading, setIsLoading] = React.useState(autoStart);
  const [isComplete, setIsComplete] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<Error | null>(null);
  const [stages, setStages] = React.useState<LoadingStage[]>([
    { id: 'terrain', label: 'Terrain', icon: <Map className="h-4 w-4" />, status: 'pending' },
    { id: 'buildings', label: 'Buildings', icon: <Building2 className="h-4 w-4" />, status: 'pending' },
    { id: 'entities', label: 'Entities', icon: <Users className="h-4 w-4" />, status: 'pending' },
    { id: 'effects', label: 'Effects', icon: <Sparkles className="h-4 w-4" />, status: 'pending' },
  ]);

  const startTimeRef = React.useRef<number>(0);

  // Update stage status based on progress
  const updateStage = React.useCallback((stageId: string, status: LoadingStage['status']) => {
    setStages((prev) =>
      prev.map((stage) => (stage.id === stageId ? { ...stage, status } : stage))
    );
  }, []);

  // Load assets
  const loadAssets = React.useCallback(async () => {
    startTimeRef.current = performance.now();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate staged loading (since we load as a bundle)
      const stageOrder = ['terrain', 'buildings', 'entities', 'effects'];

      await preloadCriticalAssets((loadProgress) => {
        setProgress(loadProgress);

        // Update stages based on progress
        const stageIndex = Math.floor((loadProgress / 100) * stageOrder.length);

        for (let i = 0; i < stageOrder.length; i++) {
          if (i < stageIndex) {
            updateStage(stageOrder[i], 'complete');
          } else if (i === stageIndex) {
            updateStage(stageOrder[i], 'loading');
          }
        }
      });

      // Mark all stages complete
      for (const stage of stageOrder) {
        updateStage(stage, 'complete');
      }

      // Ensure minimum display time
      const elapsed = performance.now() - startTimeRef.current;
      if (elapsed < minDisplayTime) {
        await new Promise((resolve) => setTimeout(resolve, minDisplayTime - elapsed));
      }

      setProgress(100);
      setIsComplete(true);
      setIsLoading(false);
      onComplete?.();
    } catch (err) {
      const loadError = err instanceof Error ? err : new Error('Failed to load assets');
      setError(loadError);
      setIsLoading(false);

      // Mark current stage as error
      setStages((prev) =>
        prev.map((stage) =>
          stage.status === 'loading' ? { ...stage, status: 'error' } : stage
        )
      );

      onError?.(loadError);
    }
  }, [minDisplayTime, onComplete, onError, updateStage]);

  // Auto-start loading
  React.useEffect(() => {
    if (autoStart) {
      loadAssets();
    }
  }, [autoStart, loadAssets]);

  // If complete, render children
  if (isComplete && children) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      {(isLoading || error) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center',
            'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
            className
          )}
        >
          <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
            {/* Logo/Title */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <h1 className="text-3xl font-bold text-white mb-2">
                Crucible Engine
              </h1>
              <p className="text-sm text-slate-400">
                Loading island assets...
              </p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full"
            >
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Loading assets</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </motion.div>

            {/* Loading Stages */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-3 w-full"
            >
              {stages.map((stage, index) => (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg',
                    'bg-slate-800/50 border',
                    stage.status === 'complete' && 'border-green-500/30',
                    stage.status === 'loading' && 'border-blue-500/50',
                    stage.status === 'error' && 'border-red-500/50',
                    stage.status === 'pending' && 'border-slate-700'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-6 h-6 rounded',
                      stage.status === 'complete' && 'text-green-400',
                      stage.status === 'loading' && 'text-blue-400',
                      stage.status === 'error' && 'text-red-400',
                      stage.status === 'pending' && 'text-slate-500'
                    )}
                  >
                    {stage.status === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : stage.status === 'complete' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : stage.status === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      stage.icon
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      stage.status === 'complete' && 'text-green-400',
                      stage.status === 'loading' && 'text-blue-400',
                      stage.status === 'error' && 'text-red-400',
                      stage.status === 'pending' && 'text-slate-500'
                    )}
                  >
                    {stage.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-400">
                      Loading Failed
                    </h3>
                    <p className="text-xs text-red-300/70 mt-1">
                      {error.message}
                    </p>
                    <button
                      onClick={loadAssets}
                      className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Skip Button (for development) */}
            {process.env.NODE_ENV === 'development' && !error && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={() => {
                  setIsComplete(true);
                  setIsLoading(false);
                  onComplete?.();
                }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Skip loading (dev only)
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AssetPreloader;
