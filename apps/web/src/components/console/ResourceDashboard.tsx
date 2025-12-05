'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Zap,
  Radio,
  Truck,
  Heart,
  Droplets,
  Utensils,
  Fuel,
  Home,
  Users,
} from 'lucide-react';

interface ResourceData {
  generators: number;
  generatorsDeployed: number;
  medicalSupplies: string;
  fuel: number;
  food: number;
  water: number;
  shelterUsed: number;
  shelterCapacity: number;
}

interface StatusData {
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
}

interface ResourceDashboardProps {
  resources: ResourceData;
  status: StatusData;
  morale: number;
  parishId: string;
  className?: string;
}

function getStatusColor(value: number): string {
  if (value >= 80) return 'text-status-safe';
  if (value >= 50) return 'text-status-warning';
  if (value >= 25) return 'text-status-danger';
  return 'text-status-critical';
}

function getProgressColor(value: number): string {
  if (value >= 80) return '[&>div]:bg-status-safe';
  if (value >= 50) return '[&>div]:bg-status-warning';
  if (value >= 25) return '[&>div]:bg-status-danger';
  return '[&>div]:bg-status-critical';
}

function getMedicalLevel(level: string): { value: number; label: string } {
  switch (level) {
    case 'high':
      return { value: 100, label: 'HIGH' };
    case 'medium':
      return { value: 65, label: 'MED' };
    case 'low':
      return { value: 30, label: 'LOW' };
    default:
      return { value: 0, label: 'NONE' };
  }
}

export function ResourceDashboard({
  resources,
  status,
  morale,
  parishId,
  className,
}: ResourceDashboardProps) {
  const medical = getMedicalLevel(resources.medicalSupplies);
  const shelterPercent = resources.shelterCapacity > 0
    ? Math.round((resources.shelterUsed / resources.shelterCapacity) * 100)
    : 0;

  // Show port only for Haven, airport only for Gateway
  const showPort = parishId === 'haven';
  const showAirport = parishId === 'gateway';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Infrastructure Status */}
      <div className="panel">
        <h3 className="panel-header">Infrastructure Status</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Power */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-3 w-3" /> Power
              </span>
              <span className={cn('font-mono', getStatusColor(status.power))}>
                {status.power}%
              </span>
            </div>
            <Progress value={status.power} className={cn('h-2', getProgressColor(status.power))} />
          </div>

          {/* Communications */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Radio className="h-3 w-3" /> Comms
              </span>
              <span className={cn('font-mono', getStatusColor(status.communications))}>
                {status.communications}%
              </span>
            </div>
            <Progress value={status.communications} className={cn('h-2', getProgressColor(status.communications))} />
          </div>

          {/* Roads */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Truck className="h-3 w-3" /> Roads
              </span>
              <span className={cn('font-mono', getStatusColor(status.roads))}>
                {status.roads}%
              </span>
            </div>
            <Progress value={status.roads} className={cn('h-2', getProgressColor(status.roads))} />
          </div>

          {/* Hospital */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Heart className="h-3 w-3" /> Hospital
              </span>
              <span className={cn('font-mono', getStatusColor(status.hospital))}>
                {status.hospital}%
              </span>
            </div>
            <Progress value={status.hospital} className={cn('h-2', getProgressColor(status.hospital))} />
          </div>

          {/* Water System */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Droplets className="h-3 w-3" /> Water Sys
              </span>
              <span className={cn('font-mono', getStatusColor(status.waterSystem))}>
                {status.waterSystem}%
              </span>
            </div>
            <Progress value={status.waterSystem} className={cn('h-2', getProgressColor(status.waterSystem))} />
          </div>

          {/* Port (Haven only) */}
          {showPort && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  ⚓ Port
                </span>
                <span className={cn('font-mono', getStatusColor(status.port))}>
                  {status.port}%
                </span>
              </div>
              <Progress value={status.port} className={cn('h-2', getProgressColor(status.port))} />
            </div>
          )}

          {/* Airport (Gateway only) */}
          {showAirport && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  ✈️ Airport
                </span>
                <span className={cn('font-mono', getStatusColor(status.airport))}>
                  {status.airport}%
                </span>
              </div>
              <Progress value={status.airport} className={cn('h-2', getProgressColor(status.airport))} />
            </div>
          )}
        </div>
      </div>

      {/* Resources */}
      <div className="panel">
        <h3 className="panel-header">Resources</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Generators */}
          <div className="p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Zap className="h-3 w-3" /> Generators
            </div>
            <div className="text-lg font-mono">
              {resources.generatorsDeployed}/{resources.generators}
            </div>
            <div className="text-[10px] text-muted-foreground">deployed/total</div>
          </div>

          {/* Medical */}
          <div className="p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Heart className="h-3 w-3" /> Medical
            </div>
            <div className={cn('text-lg font-mono', getStatusColor(medical.value))}>
              {medical.label}
            </div>
            <Progress value={medical.value} className={cn('h-1 mt-1', getProgressColor(medical.value))} />
          </div>

          {/* Fuel */}
          <div className="p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Fuel className="h-3 w-3" /> Fuel
            </div>
            <div className={cn('text-lg font-mono', getStatusColor(resources.fuel))}>
              {resources.fuel}%
            </div>
            <Progress value={resources.fuel} className={cn('h-1 mt-1', getProgressColor(resources.fuel))} />
          </div>

          {/* Food */}
          <div className="p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Utensils className="h-3 w-3" /> Food
            </div>
            <div className={cn('text-lg font-mono', getStatusColor(resources.food))}>
              {resources.food}%
            </div>
            <Progress value={resources.food} className={cn('h-1 mt-1', getProgressColor(resources.food))} />
          </div>

          {/* Water */}
          <div className="p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Droplets className="h-3 w-3" /> Water
            </div>
            <div className={cn('text-lg font-mono', getStatusColor(resources.water))}>
              {resources.water}%
            </div>
            <Progress value={resources.water} className={cn('h-1 mt-1', getProgressColor(resources.water))} />
          </div>

          {/* Shelter */}
          <div className="p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Home className="h-3 w-3" /> Shelter
            </div>
            <div className="text-lg font-mono">
              {resources.shelterUsed.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">
              of {resources.shelterCapacity.toLocaleString()} capacity
            </div>
          </div>
        </div>
      </div>

      {/* Population & Morale */}
      <div className="panel">
        <h3 className="panel-header">Population</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-mono">
              {status.populationRemaining.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono text-status-info">
              {status.populationEvacuated.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Evacuated</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-2xl font-mono',
              status.casualties > 0 ? 'text-status-critical' : 'text-muted-foreground'
            )}>
              {status.casualties}
            </div>
            <div className="text-xs text-muted-foreground">Casualties</div>
          </div>
        </div>

        {/* Morale */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Morale
            </span>
            <span className={cn('font-mono font-semibold', getStatusColor(morale))}>
              {morale}%
            </span>
          </div>
          <Progress value={morale} className={cn('h-3', getProgressColor(morale))} />
        </div>
      </div>
    </div>
  );
}
