# Concordia Interactive Map Implementation Guide

## Overview

Transform the Concordia island image into a Google Earth-like zoomable map with interactive parishes, buildings, and real-time game state overlays. This integrates with your existing Colyseus/React stack.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BUILD TIME (One-time)                        │
│  Concordia.png → Sharp tile() → /public/tiles/{z}/{x}/{y}.png   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      RUNTIME (React)                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               MapContainer (CRS.Simple)                     │ │
│  │  ┌─────────────────────────────────────────────────────┐    │ │
│  │  │  TileLayer (Concordia tiles)                        │    │ │
│  │  │  ├── SVGOverlay (Parish boundaries)                 │    │ │
│  │  │  ├── GeoJSON (Buildings, Infrastructure)            │    │ │
│  │  │  ├── Markers (Dynamic: alerts, resources, damage)   │    │ │
│  │  │  └── Polyline (Supply lines - animated)             │    │ │
│  │  └─────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↑                                   │
│                    Colyseus State Sync                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Tile Generation with Sharp

### 1.1 Install Dependencies

```bash
pnpm add sharp
```

### 1.2 Tile Generator Script

Create: `scripts/generate-tiles.ts`

```typescript
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

interface TileConfig {
  inputImage: string;
  outputDir: string;
  tileSize: number;
  maxZoom: number;
  layout: 'google' | 'dz' | 'zoomify';
}

async function generateTiles(config: TileConfig) {
  const { inputImage, outputDir, tileSize, maxZoom, layout } = config;
  
  // Ensure output directory exists
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Generating tiles from ${inputImage}...`);
  
  // Get image metadata first
  const metadata = await sharp(inputImage).metadata();
  console.log(`Source image: ${metadata.width}x${metadata.height}`);
  
  // Calculate optimal max zoom based on image size
  // At zoom 0, entire image fits in one tile
  // Each zoom level doubles resolution
  const calculatedMaxZoom = Math.ceil(
    Math.log2(Math.max(metadata.width!, metadata.height!) / tileSize)
  );
  
  const effectiveMaxZoom = Math.min(maxZoom, calculatedMaxZoom);
  console.log(`Generating zoom levels 0-${effectiveMaxZoom}`);

  // Use Sharp's built-in tile generation
  await sharp(inputImage)
    .png({ quality: 90 })
    .tile({
      size: tileSize,
      overlap: 0,
      layout: layout, // 'google' = {z}/{x}/{y}.png (Leaflet compatible)
      depth: 'onetile', // Generate all zoom levels
      skipBlanks: 5, // Skip mostly-empty tiles
      container: 'fs', // Output to filesystem
      background: { r: 28, g: 38, b: 54, alpha: 1 } // Ocean color for empty tiles
    })
    .toFile(path.join(outputDir, 'concordia'));

  // Sharp creates: outputDir/concordia_files/{z}/{x}/{y}.png
  // Reorganize to match Leaflet URL pattern if needed
  
  console.log('Tile generation complete!');
  console.log(`Tiles written to: ${outputDir}/concordia_files/`);
  
  // Generate metadata file for the map
  const mapMetadata = {
    width: metadata.width,
    height: metadata.height,
    tileSize,
    maxZoom: effectiveMaxZoom,
    bounds: [[0, 0], [metadata.height, metadata.width]],
    center: [metadata.height! / 2, metadata.width! / 2],
    generated: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(mapMetadata, null, 2)
  );
  
  return mapMetadata;
}

// Configuration for Concordia
const config: TileConfig = {
  inputImage: './assets/Concordia.png',
  outputDir: './public/tiles',
  tileSize: 256,
  maxZoom: 5, // Allows ~32x zoom from overview
  layout: 'google' // {z}/{x}/{y}.png format
};

generateTiles(config)
  .then(metadata => {
    console.log('Map metadata:', metadata);
  })
  .catch(err => {
    console.error('Tile generation failed:', err);
    process.exit(1);
  });
```

### 1.3 Add to package.json

```json
{
  "scripts": {
    "generate:tiles": "ts-node scripts/generate-tiles.ts"
  }
}
```

---

## Part 2: React-Leaflet Map Component

### 2.1 Install Dependencies

```bash
pnpm add leaflet react-leaflet
pnpm add -D @types/leaflet
```

### 2.2 Base Map Component

Create: `apps/web/src/components/map/ConcordiaMap.tsx`

```tsx
import { useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  useMap,
  useMapEvents 
} from 'react-leaflet';
import L, { CRS, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import overlay components (we'll create these)
import { ParishOverlay } from './ParishOverlay';
import { SupplyLineLayer } from './SupplyLineLayer';
import { AlertMarkers } from './AlertMarkers';
import { BuildingMarkers } from './BuildingMarkers';

// Map metadata (from tile generation)
const MAP_CONFIG = {
  width: 2048,   // Adjust to your actual image dimensions
  height: 2048,
  tileSize: 256,
  maxZoom: 5,
};

// Calculate bounds for CRS.Simple
const bounds: LatLngBounds = new L.LatLngBounds(
  [0, 0],
  [MAP_CONFIG.height, MAP_CONFIG.width]
);

const center: [number, number] = [
  MAP_CONFIG.height / 2,
  MAP_CONFIG.width / 2
];

interface ConcordiaMapProps {
  // Colyseus game state bindings
  parishes?: Parish[];
  supplyLines?: SupplyLine[];
  alerts?: Alert[];
  selectedParish?: string;
  onParishClick?: (parishId: string) => void;
  onBuildingClick?: (buildingId: string) => void;
  className?: string;
  interactive?: boolean; // false for mini-map view
}

export function ConcordiaMap({
  parishes = [],
  supplyLines = [],
  alerts = [],
  selectedParish,
  onParishClick,
  onBuildingClick,
  className = '',
  interactive = true
}: ConcordiaMapProps) {
  
  return (
    <MapContainer
      crs={CRS.Simple}
      center={center}
      zoom={1}
      minZoom={0}
      maxZoom={MAP_CONFIG.maxZoom}
      maxBounds={bounds}
      maxBoundsViscosity={1.0}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      className={`concordia-map ${className}`}
      style={{ 
        width: '100%', 
        height: '100%',
        background: '#1c2636' // Ocean color
      }}
    >
      {/* Base tile layer */}
      <TileLayer
        url="/tiles/concordia_files/{z}/{x}/{y}.png"
        bounds={bounds}
        noWrap={true}
        tileSize={MAP_CONFIG.tileSize}
        minZoom={0}
        maxZoom={MAP_CONFIG.maxZoom}
        errorTileUrl="/tiles/empty.png" // Fallback for missing tiles
      />
      
      {/* Parish boundary overlays (SVG) */}
      <ParishOverlay
        parishes={parishes}
        selectedParish={selectedParish}
        onParishClick={onParishClick}
      />
      
      {/* Supply lines (animated polylines) */}
      <SupplyLineLayer supplyLines={supplyLines} />
      
      {/* Dynamic alert markers */}
      <AlertMarkers alerts={alerts} />
      
      {/* Building/facility markers (zoom-dependent) */}
      <BuildingMarkers 
        parishes={parishes}
        onBuildingClick={onBuildingClick}
      />
      
      {/* Zoom-dependent layer controller */}
      <ZoomController />
    </MapContainer>
  );
}

// Component to handle zoom-based visibility
function ZoomController() {
  const map = useMap();
  
  useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      // Toggle layer visibility based on zoom
      // Buildings show at zoom >= 3
      // Parish labels show at zoom <= 2
      document.documentElement.style.setProperty(
        '--show-buildings', 
        zoom >= 3 ? '1' : '0'
      );
      document.documentElement.style.setProperty(
        '--show-parish-labels',
        zoom <= 2 ? '1' : '0'
      );
    }
  });
  
  return null;
}
```

### 2.3 Parish Overlay Component

Create: `apps/web/src/components/map/ParishOverlay.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { SVGOverlay, useMap } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';

// Parish definitions with SVG paths
// These coordinates are in pixel space matching your image
export const PARISH_DEFINITIONS = {
  HAVEN: {
    id: 'haven',
    name: 'Haven Parish',
    description: 'Coastal fishing community',
    color: '#3b82f6', // Blue
    // SVG path data (you'll trace this from your image)
    path: 'M 100,200 L 300,150 L 400,300 L 200,400 Z',
    center: [250, 275], // [y, x] for Leaflet
    labelOffset: [0, -20],
  },
  SUMMIT: {
    id: 'summit',
    name: 'Summit Parish',
    description: 'Mountain agricultural region',
    color: '#22c55e', // Green
    path: 'M 500,100 L 700,100 L 750,300 L 450,350 Z',
    center: [600, 225],
    labelOffset: [0, 0],
  },
  GATEWAY: {
    id: 'gateway',
    name: 'Gateway Parish',
    description: 'Industrial port district',
    color: '#f59e0b', // Amber
    path: 'M 700,400 L 900,350 L 950,600 L 650,650 Z',
    center: [800, 500],
    labelOffset: [0, 0],
  },
  HEARTLAND: {
    id: 'heartland',
    name: 'Heartland Parish',
    description: 'Central crater lake community',
    color: '#8b5cf6', // Purple
    path: 'M 400,400 L 600,400 L 600,600 L 400,600 Z',
    center: [500, 500],
    labelOffset: [0, 0],
  },
  STERLING: {
    id: 'sterling',
    name: 'Sterling Parish',
    description: 'Resort and airport district',
    color: '#ec4899', // Pink
    path: 'M 50,500 L 200,450 L 300,700 L 100,750 Z',
    center: [175, 600],
    labelOffset: [0, 0],
  },
} as const;

interface ParishOverlayProps {
  parishes: Parish[];
  selectedParish?: string;
  onParishClick?: (parishId: string) => void;
}

export function ParishOverlay({ 
  parishes, 
  selectedParish,
  onParishClick 
}: ParishOverlayProps) {
  const map = useMap();
  
  // Calculate bounds for the SVG overlay
  const bounds: LatLngBounds = map.getBounds();
  
  return (
    <SVGOverlay
      bounds={[[0, 0], [2048, 2048]]} // Match your image size
      interactive={true}
    >
      <defs>
        {/* Glow filter for selected parish */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Pattern for damaged areas */}
        <pattern id="damaged" patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" 
                stroke="#ef4444" strokeWidth="1"/>
        </pattern>
      </defs>
      
      {/* Parish boundary paths */}
      {Object.values(PARISH_DEFINITIONS).map((parish) => {
        const gameParish = parishes.find(p => p.id === parish.id);
        const isSelected = selectedParish === parish.id;
        const damage = gameParish?.damage || 0;
        
        return (
          <g key={parish.id} className="parish-group">
            {/* Main parish boundary */}
            <path
              d={parish.path}
              fill={isSelected ? `${parish.color}40` : `${parish.color}20`}
              stroke={parish.color}
              strokeWidth={isSelected ? 4 : 2}
              strokeDasharray={damage > 0.5 ? '10,5' : 'none'}
              filter={isSelected ? 'url(#glow)' : undefined}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => onParishClick?.(parish.id)}
            />
            
            {/* Damage overlay */}
            {damage > 0 && (
              <path
                d={parish.path}
                fill="url(#damaged)"
                fillOpacity={damage}
                pointerEvents="none"
              />
            )}
            
            {/* Parish label */}
            <text
              x={parish.center[1]}
              y={parish.center[0]}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="24"
              fontWeight="bold"
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                opacity: 'var(--show-parish-labels, 1)'
              }}
            >
              {parish.name}
            </text>
            
            {/* Status indicator */}
            {gameParish && (
              <circle
                cx={parish.center[1] + 60}
                cy={parish.center[0] - 30}
                r={10}
                fill={getStatusColor(gameParish.status)}
              />
            )}
          </g>
        );
      })}
    </SVGOverlay>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'normal': return '#22c55e';
    case 'warning': return '#f59e0b';
    case 'critical': return '#ef4444';
    case 'evacuating': return '#8b5cf6';
    default: return '#6b7280';
  }
}
```

### 2.4 Supply Line Layer (Animated)

Create: `apps/web/src/components/map/SupplyLineLayer.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

interface SupplyLine {
  id: string;
  from: string; // parish id
  to: string;   // parish id
  status: 'active' | 'blocked' | 'reduced' | 'severed';
  flowRate: number; // 0-1
  resource: 'power' | 'water' | 'fuel' | 'supplies';
}

interface SupplyLineLayerProps {
  supplyLines: SupplyLine[];
}

// Parish center points (from PARISH_DEFINITIONS)
const PARISH_CENTERS: Record<string, [number, number]> = {
  haven: [275, 250],
  summit: [225, 600],
  gateway: [500, 800],
  heartland: [500, 500],
  sterling: [600, 175],
};

const RESOURCE_COLORS: Record<string, string> = {
  power: '#fbbf24',  // Yellow
  water: '#3b82f6',  // Blue
  fuel: '#f97316',   // Orange
  supplies: '#22c55e' // Green
};

const STATUS_DASH: Record<string, string> = {
  active: '',
  reduced: '15,10',
  blocked: '5,15',
  severed: '2,8'
};

export function SupplyLineLayer({ supplyLines }: SupplyLineLayerProps) {
  return (
    <>
      {supplyLines.map((line) => {
        const fromPos = PARISH_CENTERS[line.from];
        const toPos = PARISH_CENTERS[line.to];
        
        if (!fromPos || !toPos) return null;
        
        const color = RESOURCE_COLORS[line.resource] || '#6b7280';
        const opacity = line.status === 'active' ? 0.8 : 0.4;
        
        return (
          <Polyline
            key={line.id}
            positions={[fromPos, toPos]}
            pathOptions={{
              color,
              weight: 4 * line.flowRate + 2,
              opacity,
              dashArray: STATUS_DASH[line.status],
              lineCap: 'round',
              lineJoin: 'round',
            }}
          >
            {/* Animated flow indicator */}
            {line.status === 'active' && (
              <AnimatedFlowLine 
                positions={[fromPos, toPos]} 
                color={color}
                speed={line.flowRate}
              />
            )}
          </Polyline>
        );
      })}
    </>
  );
}

// Animated dots flowing along the line
function AnimatedFlowLine({ 
  positions, 
  color, 
  speed 
}: { 
  positions: [number, number][];
  color: string;
  speed: number;
}) {
  const map = useMap();
  const animRef = useRef<number>();
  const markerRef = useRef<L.CircleMarker>();
  
  useEffect(() => {
    const [start, end] = positions;
    let progress = 0;
    
    const marker = L.circleMarker([0, 0], {
      radius: 4,
      fillColor: color,
      fillOpacity: 1,
      stroke: false
    }).addTo(map);
    
    markerRef.current = marker;
    
    const animate = () => {
      progress += 0.005 * speed;
      if (progress > 1) progress = 0;
      
      const lat = start[0] + (end[0] - start[0]) * progress;
      const lng = start[1] + (end[1] - start[1]) * progress;
      
      marker.setLatLng([lat, lng]);
      animRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (markerRef.current) map.removeLayer(markerRef.current);
    };
  }, [positions, color, speed, map]);
  
  return null;
}
```

### 2.5 Alert Markers Component

Create: `apps/web/src/components/map/AlertMarkers.tsx`

```tsx
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  position: [number, number]; // [y, x]
  title: string;
  description: string;
  timestamp: number;
}

interface AlertMarkersProps {
  alerts: Alert[];
}

// Custom alert icons
const createAlertIcon = (type: string) => {
  const colors = {
    critical: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  const color = colors[type as keyof typeof colors] || colors.info;
  
  return L.divIcon({
    className: 'alert-marker',
    html: `
      <div class="alert-pulse" style="--alert-color: ${color}">
        <svg viewBox="0 0 24 24" fill="${color}" width="32" height="32">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

export function AlertMarkers({ alerts }: AlertMarkersProps) {
  return (
    <>
      {alerts.map((alert) => (
        <Marker
          key={alert.id}
          position={alert.position}
          icon={createAlertIcon(alert.type)}
        >
          <Popup>
            <div className="alert-popup">
              <h4 className={`alert-title alert-${alert.type}`}>
                {alert.title}
              </h4>
              <p>{alert.description}</p>
              <span className="alert-time">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
```

### 2.6 CSS for Map Components

Add to `apps/web/src/app/globals.css`:

```css
/* Concordia Map Styles */
.concordia-map {
  --show-buildings: 0;
  --show-parish-labels: 1;
}

/* Alert marker pulse animation */
.alert-pulse {
  position: relative;
  animation: pulse 2s ease-in-out infinite;
}

.alert-pulse::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--alert-color);
  opacity: 0.4;
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* Parish hover effects */
.parish-group path {
  transition: fill 0.2s, stroke-width 0.2s;
}

.parish-group:hover path {
  fill-opacity: 0.5;
  stroke-width: 4;
}

/* Zoom-dependent visibility */
.building-marker {
  opacity: var(--show-buildings);
  transition: opacity 0.3s;
}

/* Alert popup styling */
.alert-popup {
  min-width: 200px;
}

.alert-title {
  margin: 0 0 8px;
  font-weight: 600;
}

.alert-critical { color: #ef4444; }
.alert-warning { color: #f59e0b; }
.alert-info { color: #3b82f6; }

.alert-time {
  font-size: 0.75rem;
  color: #6b7280;
}
```

---

## Part 3: Colyseus Integration

### 3.1 Map State Schema

Add to `apps/server/src/schema/CrucibleState.ts`:

```typescript
import { Schema, ArraySchema, type } from '@colyseus/schema';

export class MapAlert extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = 'info';
  @type('number') posY: number = 0;
  @type('number') posX: number = 0;
  @type('string') title: string = '';
  @type('string') description: string = '';
  @type('number') timestamp: number = 0;
  @type('number') expiresAt: number = 0;
}

export class SupplyLineState extends Schema {
  @type('string') id: string = '';
  @type('string') from: string = '';
  @type('string') to: string = '';
  @type('string') status: string = 'active';
  @type('number') flowRate: number = 1;
  @type('string') resource: string = 'supplies';
}

export class ParishMapState extends Schema {
  @type('string') id: string = '';
  @type('string') status: string = 'normal';
  @type('number') damage: number = 0;
  @type('number') population: number = 0;
  @type('boolean') evacuating: boolean = false;
}
```

### 3.2 React Hook for Map State

Create: `apps/web/src/hooks/useMapState.ts`

```typescript
import { useMemo } from 'react';
import { useColyseus } from './useColyseus';

export function useMapState() {
  const { room } = useColyseus();
  
  const mapState = useMemo(() => {
    if (!room?.state) return { parishes: [], supplyLines: [], alerts: [] };
    
    return {
      parishes: Array.from(room.state.parishes?.values() || []).map(p => ({
        id: p.id,
        status: p.status,
        damage: p.damage,
        population: p.population,
        evacuating: p.evacuating
      })),
      supplyLines: Array.from(room.state.supplyLines?.values() || []).map(s => ({
        id: s.id,
        from: s.from,
        to: s.to,
        status: s.status,
        flowRate: s.flowRate,
        resource: s.resource
      })),
      alerts: Array.from(room.state.mapAlerts?.values() || [])
        .filter(a => a.expiresAt > Date.now())
        .map(a => ({
          id: a.id,
          type: a.type,
          position: [a.posY, a.posX] as [number, number],
          title: a.title,
          description: a.description,
          timestamp: a.timestamp
        }))
    };
  }, [room?.state]);
  
  return mapState;
}
```

### 3.3 Full Integration Example

```tsx
import { ConcordiaMap } from '@/components/map/ConcordiaMap';
import { useMapState } from '@/hooks/useMapState';
import { useColyseus } from '@/hooks/useColyseus';

export function WatchstanderMap() {
  const { parishes, supplyLines, alerts } = useMapState();
  const { sendMessage } = useColyseus();
  const [selectedParish, setSelectedParish] = useState<string>();
  
  const handleParishClick = (parishId: string) => {
    setSelectedParish(parishId);
    sendMessage('map:selectParish', { parishId });
  };
  
  const handleBuildingClick = (buildingId: string) => {
    sendMessage('map:selectBuilding', { buildingId });
  };
  
  return (
    <div className="h-full relative">
      <ConcordiaMap
        parishes={parishes}
        supplyLines={supplyLines}
        alerts={alerts}
        selectedParish={selectedParish}
        onParishClick={handleParishClick}
        onBuildingClick={handleBuildingClick}
      />
      
      {/* Mini-map in corner */}
      <div className="absolute bottom-4 right-4 w-48 h-48 border border-watchstander-border rounded">
        <ConcordiaMap
          parishes={parishes}
          supplyLines={supplyLines}
          alerts={alerts}
          interactive={false}
        />
      </div>
    </div>
  );
}
```

---

## Part 4: Parish Boundary Tracing

### 4.1 Using the Concordia Image

Looking at your uploaded image, the island has clear geographical zones:

| Region | Location | Characteristics |
|--------|----------|-----------------|
| **Sterling** | West (beach/airport) | Resorts, runway, coastal |
| **Haven** | North coast | Residential, fishing port |
| **Summit** | Northeast | Agricultural terraces |
| **Gateway** | East | Industrial port, shipping |
| **Heartland** | Center | Crater lake, residential |

### 4.2 SVG Path Generation Tool

You can trace parish boundaries manually or use a tool:

```typescript
// Simple boundary tracer - run in browser console on the image
// Click points to create polygon, double-click to finish

const points: [number, number][] = [];

document.addEventListener('click', (e) => {
  const rect = document.querySelector('img')!.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  points.push([x, y]);
  console.log(`Point: [${x}, ${y}]`);
  console.log(`Path so far: M ${points.map(p => p.join(',')).join(' L ')} Z`);
});
```

---

## Part 5: Performance Optimizations

### 5.1 Tile Loading Strategy

```typescript
// Preload adjacent tiles
const preloadTiles = (zoom: number, centerX: number, centerY: number) => {
  const adjacent = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1]
  ];
  
  adjacent.forEach(([dx, dy]) => {
    const img = new Image();
    img.src = `/tiles/concordia_files/${zoom}/${centerX + dx}/${centerY + dy}.png`;
  });
};
```

### 5.2 Marker Clustering (for many buildings)

```bash
pnpm add react-leaflet-cluster
```

```tsx
import MarkerClusterGroup from 'react-leaflet-cluster';

<MarkerClusterGroup
  chunkedLoading
  maxClusterRadius={50}
  spiderfyOnMaxZoom
>
  {buildings.map(b => <Marker key={b.id} ... />)}
</MarkerClusterGroup>
```

---

## Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Tile Generation | **Sharp** `.tile()` | One-time build step |
| Map Display | **react-leaflet** + `CRS.Simple` | Zoomable viewer |
| Parish Boundaries | **SVGOverlay** | Interactive regions |
| Supply Lines | **Polyline** + animation | Resource flow viz |
| Markers | **L.divIcon** | Alerts, buildings |
| State Sync | **Colyseus** | Real-time updates |

### Build Steps

1. Run `pnpm generate:tiles` to create tile pyramid
2. Define parish SVG paths from image
3. Wire up Colyseus state to map components
4. Add CSS animations for alerts/flow

This gives you a production-ready, Google Earth-like experience for your Values Crucible simulation.
