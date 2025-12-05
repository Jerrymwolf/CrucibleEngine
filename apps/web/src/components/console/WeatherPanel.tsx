'use client';

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  CloudRain,
  Wind,
  Eye,
  Waves,
  AlertTriangle,
  Target,
  Clock,
} from 'lucide-react';

interface HurricaneData {
  name: string;
  category: number;
  trajectory: string;
  certaintyPercent: number;
  hoursToImpact: number;
  hasLandfall: boolean;
  currentAdvisory: string;
}

interface WeatherData {
  hurricane: HurricaneData;
  windSpeed: number;
  rainfall: number;
  visibility: number;
  conditions: string;
  stormSurge: number;
}

interface WeatherPanelProps {
  weather: WeatherData;
  className?: string;
}

function getCategoryColor(category: number): string {
  switch (category) {
    case 1:
      return 'text-status-warning';
    case 2:
      return 'text-status-warning';
    case 3:
      return 'text-status-danger';
    case 4:
      return 'text-status-danger';
    case 5:
      return 'text-status-critical';
    default:
      return 'text-muted-foreground';
  }
}

function getTrajectoryLabel(trajectory: string): { label: string; severity: 'low' | 'medium' | 'high' } {
  switch (trajectory) {
    case 'direct':
      return { label: 'DIRECT HIT', severity: 'high' };
    case 'glancing':
      return { label: 'GLANCING BLOW', severity: 'medium' };
    case 'miss-north':
      return { label: 'PASSING NORTH', severity: 'low' };
    case 'miss-south':
      return { label: 'PASSING SOUTH', severity: 'low' };
    case 'stall':
      return { label: 'STALLED', severity: 'medium' };
    default:
      return { label: 'UNCERTAIN', severity: 'medium' };
  }
}

function getConditionsLabel(conditions: string): string {
  switch (conditions) {
    case 'clear':
      return 'Clear Skies';
    case 'cloudy':
      return 'Overcast';
    case 'rain':
      return 'Rain';
    case 'storm':
      return 'Tropical Storm';
    case 'hurricane':
      return 'Hurricane Conditions';
    default:
      return conditions;
  }
}

export function WeatherPanel({ weather, className }: WeatherPanelProps) {
  const trajectoryInfo = getTrajectoryLabel(weather.hurricane.trajectory);
  const hoursDisplay = weather.hurricane.hoursToImpact === -1
    ? 'N/A'
    : `${weather.hurricane.hoursToImpact}h`;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Hurricane Status */}
      <div className="panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="panel-header mb-0">Hurricane {weather.hurricane.name}</h3>
          <div className={cn(
            'text-3xl font-bold',
            getCategoryColor(weather.hurricane.category)
          )}>
            CAT {weather.hurricane.category}
          </div>
        </div>

        {/* Trajectory */}
        <div className={cn(
          'p-3 rounded-lg mb-3',
          trajectoryInfo.severity === 'high' && 'bg-status-critical/20 border border-status-critical',
          trajectoryInfo.severity === 'medium' && 'bg-status-warning/20 border border-status-warning',
          trajectoryInfo.severity === 'low' && 'bg-status-safe/20 border border-status-safe'
        )}>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="font-semibold">{trajectoryInfo.label}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Certainty: {weather.hurricane.certaintyPercent}%
          </div>
          <Progress
            value={weather.hurricane.certaintyPercent}
            className="h-1 mt-2"
          />
        </div>

        {/* Time to Impact */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-muted/30 rounded text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className={cn(
              'text-xl font-mono font-bold',
              weather.hurricane.hoursToImpact !== -1 && weather.hurricane.hoursToImpact <= 6 && 'text-status-critical animate-pulse',
              weather.hurricane.hoursToImpact !== -1 && weather.hurricane.hoursToImpact <= 12 && 'text-status-danger',
              weather.hurricane.hoursToImpact !== -1 && weather.hurricane.hoursToImpact <= 24 && 'text-status-warning'
            )}>
              {hoursDisplay}
            </div>
            <div className="text-[10px] text-muted-foreground">TO IMPACT</div>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <AlertTriangle className={cn(
              'h-4 w-4 mx-auto mb-1',
              weather.hurricane.hasLandfall ? 'text-status-critical' : 'text-muted-foreground'
            )} />
            <div className="text-sm font-semibold">
              {weather.hurricane.hasLandfall ? 'LANDFALL' : 'APPROACHING'}
            </div>
            <div className="text-[10px] text-muted-foreground">STATUS</div>
          </div>
        </div>

        {/* Advisory */}
        {weather.hurricane.currentAdvisory && (
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
            <div className="font-semibold text-muted-foreground mb-1">Latest Advisory:</div>
            <p>{weather.hurricane.currentAdvisory}</p>
          </div>
        )}
      </div>

      {/* Current Conditions */}
      <div className="panel">
        <h3 className="panel-header">Current Conditions</h3>
        <div className="text-lg font-semibold mb-3">
          {getConditionsLabel(weather.conditions)}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Wind Speed */}
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-mono text-lg">{weather.windSpeed}</div>
              <div className="text-[10px] text-muted-foreground">MPH WINDS</div>
            </div>
          </div>

          {/* Rainfall */}
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
            <CloudRain className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-mono text-lg">{weather.rainfall.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground">IN/HR RAIN</div>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-mono text-lg">{weather.visibility}%</div>
              <div className="text-[10px] text-muted-foreground">VISIBILITY</div>
            </div>
          </div>

          {/* Storm Surge */}
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
            <Waves className={cn(
              'h-4 w-4',
              weather.stormSurge >= 10 && 'text-status-critical',
              weather.stormSurge >= 5 && 'text-status-danger',
              weather.stormSurge >= 2 && 'text-status-warning',
              weather.stormSurge < 2 && 'text-muted-foreground'
            )} />
            <div>
              <div className="font-mono text-lg">{weather.stormSurge}</div>
              <div className="text-[10px] text-muted-foreground">FT SURGE</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
