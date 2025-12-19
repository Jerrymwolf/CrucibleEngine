'use client';

/**
 * CommandCenter Component
 *
 * The main crisis console layout that orchestrates all crisis management components.
 *
 * Desktop: 3-panel layout (Map | Decisions | Resources)
 * Mobile: Tab-based interface with swipe navigation
 *
 * Features:
 * - Responsive layout switching
 * - Header with countdown, connection status, team info
 * - News ticker at bottom
 * - Keyboard navigation support
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Map,
  ClipboardList,
  Package,
  Cloud,
  Settings,
  Volume2,
  VolumeX,
  HelpCircle,
  Wifi,
  WifiOff,
  Clock,
  Users,
  AlertTriangle,
  Menu,
  X,
} from 'lucide-react';

// Import existing console components
import { ConcordiaMap } from './ConcordiaMap';
import { WeatherPanel } from './WeatherPanel';
import { ResourceDashboard } from './ResourceDashboard';
import { DecisionInterface } from './DecisionInterface';
import { NewsTicker } from './NewsTicker';
import { ProductionDashboard } from './ProductionDashboard';
import { ProductionHeader } from './ProductionHeader';

// ============================================================================
// TYPES
// ============================================================================

export interface CommandCenterProps {
  // Session Info
  sessionCode: string;
  teamName: string;
  parishId: string;

  // Connection
  connected: boolean;
  reconnecting?: boolean;

  // Time
  hoursRemaining: number;
  phase: 'watch' | 'warning' | 'crisis' | 'landfall' | 'recovery';

  // Map Data
  parishes: Record<string, {
    id: string;
    power: number;
    communications: number;
    morale: number;
    populationRemaining: number;
    casualties: number;
  }>;

  // Weather Data
  weather: {
    hurricane: {
      name: string;
      category: number;
      trajectory: string;
      certaintyPercent: number;
      hoursToImpact: number;
      hasLandfall: boolean;
      currentAdvisory: string;
    };
    windSpeed: number;
    rainfall: number;
    visibility: number;
    conditions: string;
    stormSurge: number;
  };

  // Resources & Status
  resources: {
    generators: number;
    generatorsDeployed: number;
    medicalSupplies: string;
    fuel: number;
    food: number;
    water: number;
    shelterUsed: number;
    shelterCapacity: number;
  };
  status: {
    power: number;
    communications: number;
    roads: number;
    hospital: number;
    port: number;
    airport: number;
    waterSystem: number;
    populationRemaining: number;
    populationEvacuated: number;
    casualties: number;
    injured: number;
  };
  morale: number;

  // News
  newsItems: Array<{
    id: string;
    content: string;
    breaking: boolean;
    timestamp: number;
  }>;

  // Production Metrics (Business Pressure)
  production?: {
    currentBatchId: string;
    batchProgress: number;
    batchValue: number;
    batchEtaHours: number;
    pipelineStatus: 'flowing' | 'blocked' | 'degraded';
    bottleneck: string;
    revenueImpact: number;
    productionHoursLost: number;
    burnRateActive: boolean;
    quarterlyTarget: number;
    quarterlyProgress: number;
    daysRemainingInQuarter: number;
    patientsAffected: number;
    childrenAffected: number;
    workersAtRisk: number;
    workersEvacuated: number;
    globalStockpileWeeks: number;
  };

  // Callbacks
  onDecision: (decision: unknown) => void;
  onParishClick?: (parishId: string) => void;

  className?: string;
}

type TabValue = 'map' | 'decisions' | 'resources' | 'weather' | 'production';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function CommandHeader({
  sessionCode,
  teamName,
  parishId,
  hoursRemaining,
  phase,
  connected,
  reconnecting,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenHelp,
}: {
  sessionCode: string;
  teamName: string;
  parishId: string;
  hoursRemaining: number;
  phase: string;
  connected: boolean;
  reconnecting?: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}) {
  const phaseColors: Record<string, string> = {
    watch: 'bg-amber-500/20 text-amber-500 border-amber-500/50',
    warning: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
    crisis: 'bg-red-500/20 text-red-500 border-red-500/50',
    landfall: 'bg-red-600/30 text-red-400 border-red-500/50 animate-pulse',
    recovery: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  };

  const phaseLabels: Record<string, string> = {
    watch: 'HURRICANE WATCH',
    warning: 'HURRICANE WARNING',
    crisis: 'CRISIS',
    landfall: 'LANDFALL',
    recovery: 'RECOVERY',
  };

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
      {/* Left: Phase indicator */}
      <div className="flex items-center gap-4">
        <motion.div
          className={cn(
            'px-3 py-1 rounded-full text-xs font-bold border',
            phaseColors[phase] || phaseColors.watch
          )}
          animate={phase === 'landfall' ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {phaseLabels[phase] || 'ACTIVE'}
        </motion.div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            'font-mono font-bold text-lg',
            hoursRemaining <= 6 && 'text-red-500 animate-pulse',
            hoursRemaining <= 12 && hoursRemaining > 6 && 'text-orange-500',
            hoursRemaining <= 24 && hoursRemaining > 12 && 'text-amber-500'
          )}>
            T-{hoursRemaining}:00
          </span>
        </div>
      </div>

      {/* Center: Team info */}
      <div className="hidden md:flex items-center gap-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Team</div>
          <div className="font-semibold">{teamName}</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Parish</div>
          <div className="font-semibold capitalize">{parishId}</div>
        </div>
      </div>

      {/* Right: Status & Controls */}
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded text-xs',
          connected && !reconnecting && 'bg-green-500/20 text-green-500',
          reconnecting && 'bg-amber-500/20 text-amber-500',
          !connected && !reconnecting && 'bg-red-500/20 text-red-500'
        )}>
          {connected && !reconnecting && <Wifi className="h-3 w-3" />}
          {reconnecting && <Wifi className="h-3 w-3 animate-pulse" />}
          {!connected && !reconnecting && <WifiOff className="h-3 w-3" />}
          <span className="hidden sm:inline">
            {connected && !reconnecting && 'Connected'}
            {reconnecting && 'Reconnecting...'}
            {!connected && !reconnecting && 'Disconnected'}
          </span>
        </div>

        {/* Sound toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSound}
          className="h-8 w-8 p-0"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>

        {/* Help */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenHelp}
          className="h-8 w-8 p-0"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

function MobileTabBar({
  activeTab,
  onTabChange,
  hasAlert,
  hasProductionAlert,
}: {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  hasAlert?: boolean;
  hasProductionAlert?: boolean;
}) {
  const tabs: { value: TabValue; label: string; icon: React.ReactNode; alert?: boolean }[] = [
    { value: 'map', label: 'Map', icon: <Map className="h-5 w-5" /> },
    { value: 'decisions', label: 'Decide', icon: <ClipboardList className="h-5 w-5" />, alert: hasAlert },
    { value: 'production', label: 'Business', icon: <AlertTriangle className="h-5 w-5" />, alert: hasProductionAlert },
    { value: 'resources', label: 'Resources', icon: <Package className="h-5 w-5" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors relative',
              activeTab === tab.value
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground'
            )}
          >
            {tab.icon}
            <span className="text-[10px]">{tab.label}</span>

            {/* Alert indicator */}
            {tab.alert && (
              <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommandCenter({
  sessionCode,
  teamName,
  parishId,
  connected,
  reconnecting,
  hoursRemaining,
  phase,
  parishes,
  weather,
  resources,
  status,
  morale,
  newsItems,
  production,
  onDecision,
  onParishClick,
  className,
}: CommandCenterProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('map');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedParish, setSelectedParish] = useState<string | null>(parishId);
  const { play: playSound } = useSound();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          setActiveTab('map');
          playSound('ui', 'click');
          break;
        case 'd':
          setActiveTab('decisions');
          playSound('ui', 'click');
          break;
        case 'r':
          setActiveTab('resources');
          playSound('ui', 'click');
          break;
        case 'w':
          setActiveTab('weather');
          playSound('ui', 'click');
          break;
        case 'p':
          setActiveTab('production');
          playSound('ui', 'click');
          break;
        case '?':
          // Open help
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playSound]);

  const handleParishClick = useCallback((id: string) => {
    setSelectedParish(id);
    onParishClick?.(id);
    playSound('ui', 'select');
  }, [onParishClick, playSound]);

  const handleTabChange = useCallback((tab: TabValue) => {
    setActiveTab(tab);
    playSound('ui', 'click');
  }, [playSound]);

  return (
    <div className={cn('h-screen flex flex-col bg-background', className)}>
      {/* Header */}
      <CommandHeader
        sessionCode={sessionCode}
        teamName={teamName}
        parishId={parishId}
        hoursRemaining={hoursRemaining}
        phase={phase}
        connected={connected}
        reconnecting={reconnecting}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenSettings={() => {}}
        onOpenHelp={() => {}}
      />

      {/* Production Metrics Header - Always visible during crisis */}
      {production && (
        <ProductionHeader production={production} />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop Layout: 4-panel when production exists, 3-panel otherwise */}
        <div className={cn(
          "hidden md:grid h-full gap-4 p-4",
          production ? "md:grid-cols-4" : "md:grid-cols-3"
        )}>
          {/* Left Panel: Map + Weather */}
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <ConcordiaMap
                parishes={parishes}
                selectedParish={selectedParish}
                onParishClick={handleParishClick}
                className="h-full"
              />
            </div>
            <div className="shrink-0">
              <WeatherPanel weather={weather} />
            </div>
          </div>

          {/* Center Panel: Decisions */}
          <div className="overflow-y-auto">
            <DecisionInterface
              parishId={parishId}
              onSubmitDecision={onDecision}
              disabled={!connected}
            />
          </div>

          {/* Resources Panel */}
          <div className="overflow-y-auto">
            <ResourceDashboard
              resources={resources}
              status={status}
              morale={morale}
              parishId={parishId}
            />
          </div>

          {/* Production Panel - Business Metrics (only if production data exists) */}
          {production && (
            <div className="overflow-y-auto">
              <ProductionDashboard production={production} />
            </div>
          )}
        </div>

        {/* Mobile Layout: Tabbed */}
        <div className="md:hidden h-full pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full p-4 overflow-y-auto"
            >
              {activeTab === 'map' && (
                <div className="space-y-4">
                  <ConcordiaMap
                    parishes={parishes}
                    selectedParish={selectedParish}
                    onParishClick={handleParishClick}
                  />
                </div>
              )}

              {activeTab === 'decisions' && (
                <DecisionInterface
                  parishId={parishId}
                  onSubmitDecision={onDecision}
                  disabled={!connected}
                />
              )}

              {activeTab === 'resources' && (
                <ResourceDashboard
                  resources={resources}
                  status={status}
                  morale={morale}
                  parishId={parishId}
                />
              )}

              {activeTab === 'weather' && (
                <WeatherPanel weather={weather} />
              )}

              {activeTab === 'production' && production && (
                <ProductionDashboard production={production} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* News Ticker */}
      <NewsTicker items={newsItems} className="shrink-0" />

      {/* Mobile Tab Bar */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasAlert={newsItems.some((n) => n.breaking)}
        hasProductionAlert={production?.burnRateActive}
      />

      {/* Keyboard shortcuts help (hidden, for screen readers) */}
      <div className="sr-only">
        Press M for Map, D for Decisions, R for Resources, W for Weather, P for Production
      </div>
    </div>
  );
}

export default CommandCenter;
