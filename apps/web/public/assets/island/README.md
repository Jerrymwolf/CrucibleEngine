# Island Assets

This directory contains sprites for the isometric island renderer.

## Directory Structure

```
island/
  terrain/      # Isometric tile sprites (64x32)
  buildings/    # Building sprites (various sizes)
  entities/     # Character and vehicle sprites
  effects/      # Weather and status effects
  ui/           # Cursor and UI elements
  spritesheets/ # Packed sprite atlases
```

## Kenney Asset Integration

We use free CC0 assets from [Kenney.nl](https://kenney.nl).

### Recommended Packs

1. **Isometric Buildings** - https://kenney.nl/assets/isometric-buildings
   - Perfect for warehouse, hospital, power station, etc.
   - Includes PNG sprites at multiple scales

2. **Tiny Town** - https://kenney.nl/assets/tiny-town
   - Great for vehicles, workers, small props
   - 16x16 grid-based sprites

3. **UI Audio** - https://kenney.nl/assets/ui-audio
   - Click, hover, confirm sounds
   - OGG format, convert to MP3 if needed

### Installation Steps

1. **Download Assets**
   ```bash
   # Visit and download:
   # https://kenney.nl/assets/isometric-buildings
   # https://kenney.nl/assets/tiny-town
   ```

2. **Extract and Copy**
   ```bash
   # Copy isometric building PNGs to:
   public/assets/island/buildings/

   # Copy tiny town sprites to:
   public/assets/island/entities/
   ```

3. **Update Asset Manifest**
   Edit `src/lib/island/assets.ts` to update file paths and dimensions.

### Sprite Sheet Usage

For optimal performance, use sprite sheets instead of individual files:

1. Place atlas JSON and PNG in `spritesheets/`
2. Use `spriteSheetLoader.load()` to parse
3. Access individual frames via `getTexture(sheetId, frameName)`

## Placeholder Generation

For development without real assets, run:

```bash
npx ts-node scripts/generate-placeholders.ts
```

This creates simple colored SVG placeholders.

## Asset Manifest

All assets are defined in `src/lib/island/assets.ts`:

```typescript
export const ASSET_MANIFEST = {
  terrain: { /* tile definitions */ },
  buildings: { /* building definitions */ },
  entities: { /* character/vehicle definitions */ },
  effects: { /* weather/status effects */ },
  ui: { /* cursor and UI elements */ },
};
```

Each asset includes:
- `id`: Unique identifier
- `path`: File path relative to /public
- `width/height`: Sprite dimensions
- `anchor`: Pivot point (0-1)
- `frames`: Animation frame count (optional)
- `frameRate`: Animation speed (optional)

## Color Reference

### Terrain Colors
| Type | Color |
|------|-------|
| water_deep | #1e3a5f |
| water_shallow | #60a5fa |
| sand | #fcd34d |
| grass | #4ade80 |
| forest | #166534 |
| mountain | #78716c |
| volcanic | #7c2d12 |
| road | #6b7280 |

### Building Status Colors
| Status | Color |
|--------|-------|
| operational | #22c55e (green) |
| damaged | #eab308 (yellow) |
| critical | #ef4444 (red) |
| destroyed | #6b7280 (gray) |
| under_repair | #3b82f6 (blue) |

## Performance Tips

1. Use sprite sheets over individual files
2. Enable texture compression for WebGL
3. Implement LOD (Level of Detail) for distant tiles
4. Batch similar sprites in rendering

## License

Kenney assets are CC0 (public domain). Free for any use.
See: https://creativecommons.org/publicdomain/zero/1.0/
