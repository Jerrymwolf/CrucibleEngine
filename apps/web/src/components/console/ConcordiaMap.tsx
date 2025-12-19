'use client';

/**
 * ConcordiaMap Component - UNDRR-Style Choropleth
 *
 * Professional emergency management visualization with:
 * - Choropleth polygons for each parish (instead of dot markers)
 * - Risk index calculation (0-10 composite score)
 * - UNDRR/INFORM-style color interpolation (green → yellow → red)
 * - Professional legend with gradient bar
 * - Enhanced tooltips with mini bar charts
 * - Weather overlay effects (hurricane indicator, rain)
 * - Zoom and pan support
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PARISHES } from '@crucible/shared';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  Zap,
  Radio,
  Heart,
  Users,
  Droplets,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// ============================================================================
// TYPES
// ============================================================================

interface ParishData {
  id: string;
  power: number;
  communications: number;
  morale: number;
  populationRemaining: number;
  casualties: number;
  // Optional extended fields
  roads?: number;
  waterSystem?: number;
  hospital?: number;
}

interface WeatherOverlay {
  intensity: 'none' | 'light' | 'moderate' | 'heavy' | 'extreme';
  stormPosition?: { x: number; y: number };
  windDirection?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
}

export interface ConcordiaMapProps {
  parishes?: Record<string, ParishData>;
  selectedParish?: string | null;
  onParishClick?: (parishId: string) => void;
  weather?: WeatherOverlay;
  showConnections?: boolean;
  className?: string;
  /** Use choropleth polygons instead of dot markers */
  useChoropleth?: boolean;
}

// ============================================================================
// PARISH POLYGON PATHS - UNDRR-Style Choropleth
// ============================================================================

const PARISH_POLYGONS: Record<string, { path: string; labelPos: { x: number; y: number } }> = {
  summit: {
    // Northern mountainous region
    path: 'M 35,8 Q 42,5 55,5 Q 68,5 72,12 Q 70,20 60,22 Q 50,24 40,22 Q 32,18 35,8 Z',
    labelPos: { x: 52, y: 14 },
  },
  keystone: {
    // Central-east industrial hub
    path: 'M 60,22 Q 72,20 80,28 Q 85,38 82,48 Q 78,52 68,52 Q 58,50 55,42 Q 54,32 60,22 Z',
    labelPos: { x: 70, y: 38 },
  },
  haven: {
    // Eastern coastal/port area
    path: 'M 68,52 Q 78,52 85,58 Q 90,65 85,72 Q 78,78 65,76 Q 55,72 55,62 Q 58,54 68,52 Z',
    labelPos: { x: 72, y: 64 },
  },
  heartland: {
    // Central agricultural region
    path: 'M 40,22 Q 50,24 55,32 Q 55,42 50,50 Q 42,56 32,52 Q 22,48 20,38 Q 22,28 32,22 Q 36,20 40,22 Z',
    labelPos: { x: 38, y: 38 },
  },
  sterling: {
    // South-central residential
    path: 'M 32,52 Q 42,56 50,58 Q 55,62 55,72 Q 50,80 38,80 Q 25,78 20,68 Q 18,58 25,52 Q 28,50 32,52 Z',
    labelPos: { x: 38, y: 66 },
  },
  gateway: {
    // Southern gateway/airport area
    path: 'M 50,58 Q 55,56 58,58 Q 55,62 55,72 Q 55,78 60,82 Q 50,85 42,82 Q 38,80 42,72 Q 45,65 50,58 Z',
    labelPos: { x: 52, y: 72 },
  },
};

// ============================================================================
// RISK INDEX CALCULATION (UNDRR/INFORM Style)
// ============================================================================

/**
 * Calculate composite risk index (0-10 scale)
 * Based on UNDRR INFORM methodology:
 * - Hazard & Exposure (infrastructure damage)
 * - Vulnerability (population at risk)
 * - Lack of Coping Capacity (resource availability)
 */
function calculateRiskIndex(data: ParishData): number {
  // Hazard & Exposure: inverse of infrastructure health
  const infraHealth = (
    data.power +
    data.communications +
    (data.roads ?? 70) +
    (data.waterSystem ?? 80) +
    (data.hospital ?? 75)
  ) / 5;
  const hazardScore = (100 - infraHealth) / 10; // 0-10

  // Vulnerability: casualties and population impact
  const casualtyRate = data.casualties / Math.max(data.populationRemaining, 1);
  const vulnerabilityScore = Math.min(casualtyRate * 1000, 10); // 0-10

  // Lack of Coping Capacity: inverse of morale
  const copingScore = (100 - data.morale) / 10; // 0-10

  // Composite: weighted average (INFORM uses equal weights)
  const composite = (hazardScore * 0.4 + vulnerabilityScore * 0.3 + copingScore * 0.3);

  return Math.min(10, Math.max(0, Math.round(composite * 10) / 10));
}

/**
 * Get risk level category from index
 */
function getRiskLevel(index: number): 'very-low' | 'low' | 'medium' | 'high' | 'very-high' {
  if (index < 2) return 'very-low';
  if (index < 4) return 'low';
  if (index < 6) return 'medium';
  if (index < 8) return 'high';
  return 'very-high';
}

// ============================================================================
// COLOR INTERPOLATION (UNDRR Green → Yellow → Red)
// ============================================================================

/**
 * Interpolate between UNDRR risk colors based on index (0-10)
 * Green (safe) → Yellow (caution) → Orange → Red (critical)
 */
function getRiskColor(riskIndex: number): string {
  // Color stops: Green (0) → Yellow (3.5) → Orange (6.5) → Red (10)
  const stops = [
    { pos: 0, r: 34, g: 197, b: 94 },    // Green-500
    { pos: 3.5, r: 234, g: 179, b: 8 },  // Yellow-500
    { pos: 6.5, r: 249, g: 115, b: 22 }, // Orange-500
    { pos: 10, r: 239, g: 68, b: 68 },   // Red-500
  ];

  // Find surrounding stops
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (riskIndex >= stops[i].pos && riskIndex <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  // Interpolate
  const range = upper.pos - lower.pos;
  const t = range === 0 ? 0 : (riskIndex - lower.pos) / range;

  const r = Math.round(lower.r + (upper.r - lower.r) * t);
  const g = Math.round(lower.g + (upper.g - lower.g) * t);
  const b = Math.round(lower.b + (upper.b - lower.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get fill opacity based on risk (higher risk = more opaque)
 */
function getRiskOpacity(riskIndex: number): number {
  return 0.4 + (riskIndex / 10) * 0.4; // 0.4 to 0.8
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function RainEffect({ intensity }: { intensity: string }) {
  if (intensity === 'none' || intensity === 'light') return null;

  const dropCount = {
    moderate: 30,
    heavy: 60,
    extreme: 100,
  }[intensity] || 30;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(dropCount)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-px bg-gradient-to-b from-transparent via-blue-400/30 to-transparent"
          style={{
            left: `${Math.random() * 100}%`,
            height: `${10 + Math.random() * 20}px`,
          }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: '100vh', opacity: [0, 0.5, 0] }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

function HurricaneIndicator({ position, intensity }: { position?: { x: number; y: number }; intensity: string }) {
  if (intensity === 'none' || !position) return null;

  const size = {
    light: 15,
    moderate: 20,
    heavy: 28,
    extreme: 35,
  }[intensity] || 20;

  return (
    <motion.g
      style={{ transformOrigin: `${position.x}% ${position.y}%` }}
    >
      {/* Outer rotating band */}
      <motion.circle
        cx={position.x}
        cy={position.y * 0.75}
        r={size}
        fill="none"
        stroke="rgba(148, 163, 184, 0.3)"
        strokeWidth="2"
        strokeDasharray="8 4"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${position.x}px ${position.y * 0.75}px` }}
      />
      {/* Middle band */}
      <motion.circle
        cx={position.x}
        cy={position.y * 0.75}
        r={size * 0.65}
        fill="none"
        stroke="rgba(148, 163, 184, 0.4)"
        strokeWidth="2"
        strokeDasharray="6 3"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${position.x}px ${position.y * 0.75}px` }}
      />
      {/* Inner band */}
      <motion.circle
        cx={position.x}
        cy={position.y * 0.75}
        r={size * 0.35}
        fill="none"
        stroke="rgba(148, 163, 184, 0.5)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${position.x}px ${position.y * 0.75}px` }}
      />
      {/* Eye */}
      <circle
        cx={position.x}
        cy={position.y * 0.75}
        r={size * 0.12}
        fill="rgba(100, 116, 139, 0.6)"
      />
    </motion.g>
  );
}

// Mini bar chart for tooltips
function MiniBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  return (
    <div className="space-y-1.5">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-12 truncate">{item.label}</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${item.value}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
          </div>
          <span className="text-[9px] font-mono w-8 text-right">{item.value}%</span>
        </div>
      ))}
    </div>
  );
}

// Parish polygon with choropleth coloring
function ParishPolygon({
  parishId,
  parish,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: {
  parishId: string;
  parish: (typeof PARISHES)[keyof typeof PARISHES];
  data?: ParishData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const polygon = PARISH_POLYGONS[parishId];
  if (!polygon) return null;

  const riskIndex = data ? calculateRiskIndex(data) : 0;
  const riskColor = getRiskColor(riskIndex);
  const riskOpacity = getRiskOpacity(riskIndex);
  const riskLevel = getRiskLevel(riskIndex);

  // Chart data for tooltip
  const chartData = data ? [
    { label: 'Power', value: data.power, color: getRiskColor((100 - data.power) / 10) },
    { label: 'Comms', value: data.communications, color: getRiskColor((100 - data.communications) / 10) },
    { label: 'Morale', value: data.morale, color: getRiskColor((100 - data.morale) / 10) },
    { label: 'Roads', value: data.roads ?? 70, color: getRiskColor((100 - (data.roads ?? 70)) / 10) },
  ] : [];

  return (
    <g className="cursor-pointer">
      {/* Polygon fill */}
      <motion.path
        d={polygon.path}
        fill={riskColor}
        fillOpacity={riskOpacity}
        stroke={isSelected ? 'white' : isHovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'}
        strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0.5}
        onClick={onClick}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        whileHover={{ fillOpacity: riskOpacity + 0.15 }}
        animate={{
          fillOpacity: riskLevel === 'very-high' ? [riskOpacity, riskOpacity + 0.1, riskOpacity] : riskOpacity,
        }}
        transition={riskLevel === 'very-high' ? { duration: 1.5, repeat: Infinity } : { duration: 0.2 }}
      />

      {/* Parish label */}
      <text
        x={polygon.labelPos.x}
        y={polygon.labelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className={cn(
          'text-[4px] font-semibold pointer-events-none select-none',
          isSelected ? 'fill-white' : 'fill-white/90'
        )}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
      >
        {parish.name}
      </text>

      {/* Risk index badge */}
      {data && (
        <g>
          <circle
            cx={polygon.labelPos.x}
            cy={polygon.labelPos.y + 6}
            r={4}
            fill="rgba(0,0,0,0.7)"
            stroke={riskColor}
            strokeWidth={0.5}
          />
          <text
            x={polygon.labelPos.x}
            y={polygon.labelPos.y + 6.5}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[3px] font-bold fill-white pointer-events-none select-none"
          >
            {riskIndex.toFixed(1)}
          </text>
        </g>
      )}

      {/* Casualty alert indicator */}
      {data && data.casualties > 0 && (
        <motion.circle
          cx={polygon.labelPos.x + 8}
          cy={polygon.labelPos.y - 4}
          r={2.5}
          fill="#ef4444"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && data && (
          <foreignObject
            x={polygon.labelPos.x + 12}
            y={polygon.labelPos.y - 30}
            width="120"
            height="140"
            className="pointer-events-none overflow-visible"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-border">
                <span className="text-[10px] font-bold">{parish.name}</span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: riskColor, color: 'white' }}
                >
                  Risk: {riskIndex.toFixed(1)}
                </span>
              </div>

              {/* Mini bar chart */}
              <MiniBarChart data={chartData} />

              {/* Population stats */}
              <div className="mt-2 pt-1 border-t border-border grid grid-cols-2 gap-1 text-[9px]">
                <div className="flex items-center gap-1">
                  <Users className="h-2.5 w-2.5 text-muted-foreground" />
                  <span>{data.populationRemaining.toLocaleString()}</span>
                </div>
                {data.casualties > 0 && (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <span className="font-bold">{data.casualties}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </foreignObject>
        )}
      </AnimatePresence>
    </g>
  );
}

// Professional gradient legend (UNDRR style)
function RiskLegend() {
  return (
    <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
      <div className="text-[10px] font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
        Risk Index
      </div>

      {/* Gradient bar */}
      <div className="relative h-3 w-32 rounded-sm overflow-hidden mb-1">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgb(34, 197, 94), rgb(234, 179, 8), rgb(249, 115, 22), rgb(239, 68, 68))',
          }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
        <span>0</span>
        <span>2.5</span>
        <span>5</span>
        <span>7.5</span>
        <span>10</span>
      </div>

      {/* Risk level labels */}
      <div className="mt-2 space-y-0.5 text-[9px]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'rgb(34, 197, 94)' }} />
          <span>Very Low (0-2)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'rgb(234, 179, 8)' }} />
          <span>Low-Medium (2-5)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'rgb(249, 115, 22)' }} />
          <span>High (5-8)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'rgb(239, 68, 68)' }} />
          <span>Very High (8-10)</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConcordiaMap({
  parishes,
  selectedParish,
  onParishClick,
  weather = { intensity: 'none' },
  showConnections = false,
  className,
  useChoropleth = true,
}: ConcordiaMapProps) {
  const [hoveredParish, setHoveredParish] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const { play: playSound } = useSound();

  const handleParishClick = useCallback((parishId: string) => {
    onParishClick?.(parishId);
    playSound('ui', 'select');
  }, [onParishClick, playSound]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 2));
    playSound('ui', 'click');
  }, [playSound]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 1));
    playSound('ui', 'click');
  }, [playSound]);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    playSound('ui', 'click');
  }, [playSound]);

  // Calculate island-wide average risk
  const averageRisk = useMemo(() => {
    if (!parishes) return 0;
    const risks = Object.values(parishes).map(calculateRiskIndex);
    return risks.length > 0 ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;
  }, [parishes]);

  return (
    <div className={cn('relative rounded-xl overflow-hidden bg-slate-900/50 border border-white/10', className)}>
      {/* Weather effects layer */}
      <RainEffect intensity={weather.intensity} />

      {/* Average risk indicator */}
      <div className="absolute top-2 left-2 z-20 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 border border-border">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Island Risk</span>
        <span
          className="text-xs font-bold font-mono px-2 py-0.5 rounded"
          style={{
            backgroundColor: getRiskColor(averageRisk),
            color: 'white',
          }}
        >
          {averageRisk.toFixed(1)}
        </span>
      </div>

      {/* Map container with zoom/pan */}
      <motion.div
        className="relative aspect-[4/3] w-full"
        animate={{
          scale: zoom,
          x: pan.x,
          y: pan.y,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Island SVG */}
        <svg
          viewBox="0 0 100 75"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Ocean background gradient */}
          <defs>
            <radialGradient id="oceanGradient" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="hsl(210 50% 15%)" />
              <stop offset="100%" stopColor="hsl(210 50% 8%)" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Ocean */}
          <rect x="0" y="0" width="100" height="75" fill="url(#oceanGradient)" />

          {/* Island base shape (subtle outline) */}
          <path
            d="M 15 35
               Q 10 25, 25 15
               Q 45 5, 70 15
               Q 90 20, 90 40
               Q 92 55, 75 65
               Q 55 75, 35 70
               Q 15 65, 10 50
               Q 8 40, 15 35 Z"
            fill="hsl(217 33% 12%)"
            stroke="hsl(217 33% 25%)"
            strokeWidth="0.3"
          />

          {/* Hurricane indicator */}
          <HurricaneIndicator position={weather.stormPosition} intensity={weather.intensity} />

          {/* Parish polygons (choropleth) */}
          {useChoropleth && Object.values(PARISHES).map((parish) => (
            <ParishPolygon
              key={parish.id}
              parishId={parish.id}
              parish={parish}
              data={parishes?.[parish.id]}
              isSelected={selectedParish === parish.id}
              isHovered={hoveredParish === parish.id}
              onClick={() => handleParishClick(parish.id)}
              onHover={(hovering) => setHoveredParish(hovering ? parish.id : null)}
            />
          ))}

          {/* Road connections (optional) */}
          {showConnections && (
            <g className="opacity-20">
              <path
                d="M 38,38 L 52,14 M 38,38 L 70,38 M 38,38 L 38,66 M 70,38 L 72,64 M 38,66 L 52,72 M 52,72 L 72,64"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
                strokeDasharray="2 1"
              />
            </g>
          )}
        </svg>
      </motion.div>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom >= 2}
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          className="h-8 w-8 p-0"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Professional UNDRR-style legend */}
      <RiskLegend />

      {/* Storm intensity indicator */}
      {weather.intensity !== 'none' && (
        <motion.div
          className={cn(
            'absolute top-12 left-2 px-2 py-1 rounded text-xs font-semibold z-20',
            weather.intensity === 'extreme' && 'bg-red-500/30 text-red-300 animate-pulse',
            weather.intensity === 'heavy' && 'bg-orange-500/30 text-orange-300',
            weather.intensity === 'moderate' && 'bg-amber-500/30 text-amber-300',
            weather.intensity === 'light' && 'bg-blue-500/30 text-blue-300'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {weather.intensity.toUpperCase()} CONDITIONS
        </motion.div>
      )}
    </div>
  );
}

export default ConcordiaMap;
