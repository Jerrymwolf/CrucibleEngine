'use client';

import { useState } from 'react';
import { PARISHES } from '@crucible/shared';
import { cn } from '@/lib/utils';

interface ParishData {
  id: string;
  power: number;
  communications: number;
  morale: number;
  populationRemaining: number;
  casualties: number;
}

interface ConcordiaMapProps {
  parishes?: Record<string, ParishData>;
  selectedParish?: string | null;
  onParishClick?: (parishId: string) => void;
  className?: string;
}

function getStatusColor(value: number): string {
  if (value >= 80) return 'bg-status-safe';
  if (value >= 50) return 'bg-status-warning';
  if (value >= 25) return 'bg-status-danger';
  return 'bg-status-critical';
}

function getStatusRingColor(value: number): string {
  if (value >= 80) return 'ring-status-safe';
  if (value >= 50) return 'ring-status-warning';
  if (value >= 25) return 'ring-status-danger';
  return 'ring-status-critical';
}

export function ConcordiaMap({
  parishes,
  selectedParish,
  onParishClick,
  className,
}: ConcordiaMapProps) {
  const [hoveredParish, setHoveredParish] = useState<string | null>(null);

  return (
    <div className={cn('concordia-map aspect-[4/3] relative', className)}>
      {/* Island outline (stylized) */}
      <svg
        viewBox="0 0 100 75"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Island shape */}
        <path
          d="M 15 35
             Q 10 25, 25 15
             Q 45 5, 70 15
             Q 90 20, 90 40
             Q 92 55, 75 65
             Q 55 75, 35 70
             Q 15 65, 10 50
             Q 8 40, 15 35 Z"
          fill="hsl(217 33% 17%)"
          stroke="hsl(217 33% 25%)"
          strokeWidth="0.5"
        />

        {/* Mountain range in Summit area */}
        <path
          d="M 40 20 L 45 12 L 50 18 L 55 10 L 60 20"
          fill="none"
          stroke="hsl(217 33% 30%)"
          strokeWidth="0.5"
        />
      </svg>

      {/* Parish markers */}
      {Object.values(PARISHES).map((parish) => {
        const parishData = parishes?.[parish.id];
        const isSelected = selectedParish === parish.id;
        const isHovered = hoveredParish === parish.id;

        // Calculate overall status from parish data
        const overallStatus = parishData
          ? Math.round((parishData.power + parishData.communications + parishData.morale) / 3)
          : 100;

        return (
          <button
            key={parish.id}
            className={cn(
              'parish-marker flex flex-col items-center gap-1',
              isSelected && 'selected z-10',
              isHovered && 'scale-110 z-10'
            )}
            style={{
              left: `${parish.position.x}%`,
              top: `${parish.position.y}%`,
            }}
            onClick={() => onParishClick?.(parish.id)}
            onMouseEnter={() => setHoveredParish(parish.id)}
            onMouseLeave={() => setHoveredParish(null)}
          >
            {/* Status indicator */}
            <div
              className={cn(
                'w-4 h-4 rounded-full ring-2 ring-offset-1 ring-offset-background',
                getStatusColor(overallStatus),
                getStatusRingColor(overallStatus)
              )}
            />

            {/* Label */}
            <span
              className={cn(
                'text-[10px] font-semibold px-1 py-0.5 rounded bg-background/80',
                isSelected && 'bg-primary text-primary-foreground',
                isHovered && 'bg-primary/80 text-primary-foreground'
              )}
            >
              {parish.name}
            </span>

            {/* Popup on hover */}
            {isHovered && parishData && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg p-2 shadow-lg min-w-[120px] z-20">
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Power</span>
                    <span className="font-mono">{parishData.power}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comms</span>
                    <span className="font-mono">{parishData.communications}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Morale</span>
                    <span className="font-mono">{parishData.morale}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pop.</span>
                    <span className="font-mono">{parishData.populationRemaining.toLocaleString()}</span>
                  </div>
                  {parishData.casualties > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Casualties</span>
                      <span className="font-mono">{parishData.casualties}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </button>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-background/80 rounded p-2 text-[10px] space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-safe" />
          <span>Operational</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-warning" />
          <span>Stressed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-danger" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-critical animate-pulse" />
          <span>Failing</span>
        </div>
      </div>
    </div>
  );
}
