'use client';

/**
 * MiniMap - Compact navigation map for the console footer
 *
 * Displays a simplified view of Concordia Island with:
 * - Parish regions with risk colors
 * - Hurricane position indicator
 * - Camera viewport indicator (for tactical view)
 * - Click-to-navigate functionality
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';

// =============================================================================
// TYPES
// =============================================================================

interface ParishData {
  id: string;
  name: string;
  power: number;
  communications: number;
  morale: number;
  population: number;
  casualties: number;
  status: 'operational' | 'stressed' | 'critical' | 'offline';
}

interface MiniMapProps {
  /** Parish data for coloring regions */
  parishes: Record<string, ParishData>;
  /** Hurricane position (0-100 coordinates) */
  hurricane?: { x: number; y: number; intensity: number };
  /** Currently selected parish */
  selectedParish?: string | null;
  /** Parish selection handler */
  onParishSelect?: (parishId: string) => void;
  /** Camera viewport (for tactical view overlay) */
  viewport?: { x: number; y: number; width: number; height: number };
  /** Viewport click handler */
  onViewportClick?: (x: number, y: number) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// PARISH SIMPLIFIED PATHS (for minimap scale)
// =============================================================================

const MINI_PARISH_PATHS: Record<string, { path: string; center: { x: number; y: number } }> = {
  summit: {
    path: 'M 35,8 Q 50,4 65,8 Q 62,18 50,20 Q 38,18 35,8 Z',
    center: { x: 50, y: 12 },
  },
  keystone: {
    path: 'M 58,18 Q 75,15 82,28 Q 78,42 65,45 Q 55,40 58,18 Z',
    center: { x: 68, y: 30 },
  },
  haven: {
    path: 'M 65,45 Q 80,42 88,55 Q 82,70 68,72 Q 58,65 65,45 Z',
    center: { x: 74, y: 58 },
  },
  heartland: {
    path: 'M 18,25 Q 35,18 50,25 Q 48,42 35,48 Q 20,42 18,25 Z',
    center: { x: 34, y: 34 },
  },
  sterling: {
    path: 'M 22,48 Q 40,42 52,52 Q 48,68 35,72 Q 18,65 22,48 Z',
    center: { x: 36, y: 58 },
  },
  gateway: {
    path: 'M 38,72 Q 55,68 68,75 Q 62,88 50,92 Q 38,88 38,72 Z',
    center: { x: 52, y: 82 },
  },
};

// =============================================================================
// RISK CALCULATION
// =============================================================================

function calculateRiskIndex(data: ParishData): number {
  const infraRisk = 10 - ((data.power + data.communications) / 200) * 10;
  const socialRisk = 10 - (data.morale / 100) * 10;
  const casualtyRisk = Math.min(10, data.casualties / 5);
  return (infraRisk * 0.4) + (socialRisk * 0.3) + (casualtyRisk * 0.3);
}

function getRiskColor(riskIndex: number): string {
  const clamped = Math.max(0, Math.min(10, riskIndex));
  if (clamped <= 2.5) return '#22c55e';
  if (clamped <= 5) return '#eab308';
  if (clamped <= 7.5) return '#f97316';
  return '#ef4444';
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MiniMap({
  parishes,
  hurricane,
  selectedParish,
  onParishSelect,
  viewport,
  onViewportClick,
  className,
}: MiniMapProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const { playUI } = useSound();

  // Handle parish click
  const handleParishClick = React.useCallback(
    (parishId: string) => {
      playUI('select');
      onParishSelect?.(parishId);
    },
    [playUI, onParishSelect]
  );

  // Handle viewport area click
  const handleSvgClick = React.useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !onViewportClick) return;

      const rect = svgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      onViewportClick(x, y);
    },
    [onViewportClick]
  );

  return (
    <div className={cn('relative bg-card rounded-lg border overflow-hidden', className)}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="w-full h-full"
        onClick={handleSvgClick}
      >
        {/* Ocean background */}
        <rect x="0" y="0" width="100" height="100" fill="#1e3a5f" />

        {/* Island base */}
        <ellipse cx="50" cy="50" rx="42" ry="45" fill="#2d4a3e" opacity="0.4" />

        {/* Parish regions */}
        {Object.entries(MINI_PARISH_PATHS).map(([parishId, { path }]) => {
          const data = parishes[parishId];
          if (!data) return null;

          const riskIndex = calculateRiskIndex(data);
          const fillColor = getRiskColor(riskIndex);
          const isSelected = selectedParish === parishId;

          return (
            <motion.path
              key={parishId}
              d={path}
              fill={fillColor}
              stroke={isSelected ? '#ffffff' : '#374151'}
              strokeWidth={isSelected ? 1.5 : 0.5}
              opacity={isSelected ? 1 : 0.85}
              style={{ cursor: 'pointer' }}
              whileHover={{ opacity: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                handleParishClick(parishId);
              }}
            />
          );
        })}

        {/* Crater lake */}
        <ellipse cx="50" cy="48" rx="8" ry="6" fill="#60a5fa" opacity="0.6" />

        {/* Hurricane indicator */}
        {hurricane && (
          <g transform={`translate(${hurricane.x}, ${hurricane.y})`}>
            <motion.circle
              r={3 + hurricane.intensity * 0.5}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="0.5"
              strokeDasharray="2 1"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <circle r="2" fill="#374151" opacity="0.8" />
            <text
              y="0.5"
              textAnchor="middle"
              fontSize="3"
              fill="white"
            >
              🌀
            </text>
          </g>
        )}

        {/* Camera viewport indicator */}
        {viewport && (
          <rect
            x={viewport.x}
            y={viewport.y}
            width={viewport.width}
            height={viewport.height}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.7"
          />
        )}

        {/* Selected parish highlight ring */}
        {selectedParish && MINI_PARISH_PATHS[selectedParish] && (
          <motion.circle
            cx={MINI_PARISH_PATHS[selectedParish].center.x}
            cy={MINI_PARISH_PATHS[selectedParish].center.y}
            r="6"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </svg>

      {/* Parish label overlay */}
      {selectedParish && parishes[selectedParish] && (
        <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-background/90 text-center">
          <span className="text-[10px] font-medium truncate">
            {parishes[selectedParish].name}
          </span>
        </div>
      )}
    </div>
  );
}

export default MiniMap;
