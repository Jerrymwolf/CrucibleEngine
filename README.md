# The Values Crucible - CrucibleEngine

AI-powered multiplayer crisis simulation for leadership development.

## Overview

The Values Crucible is a crisis simulation platform where teams manage parishes on the fictional island of **Concordia** during **Hurricane Midas**. The simulation reveals the gap between stated values and enacted values under pressure.

## Tech Stack

- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript 5.6+ (strict mode)
- **AI**: Claude API via Anthropic SDK
- **Real-time**: Colyseus 0.16+
- **Frontend**: Next.js 15 (App Router) + React 19
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **State**: Zustand

## Project Structure

```
crucible-engine/
├── apps/
│   ├── server/          # Colyseus game server + AI agents
│   └── web/             # Next.js 15 frontend
├── packages/
│   └── shared/          # Shared types and constants
├── prisma/              # Database schema
└── package.json         # Workspace root
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16+

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push
```

### Development

```bash
# Start all services (server + web)
pnpm dev

# Or start individually:
pnpm --filter @crucible/server dev
pnpm --filter @crucible/web dev
```

### Building

```bash
pnpm build
```

## Architecture

### Server

The Colyseus server manages:
- **CrucibleRoom**: Main game room with full state synchronization
- **CrucibleState**: Schema for all synchronized game state
- **AI Agents**: Narrative, Consequence, Tempest Monitor, Values Observer, Report

### Frontend

- **Home Page**: Join or create sessions
- **Session Page**: Team console (parish selection, storm simulation)
- **CM Page**: Crucible Master console (controls, overview, intensity)

### Real-time Communication

Uses Colyseus for:
- Delta-compressed state synchronization
- Room-based session management
- Message handlers for decisions and directives

## Key Concepts

### Parishes

Five interconnected parishes on Concordia:
- **Haven**: Maritime hub (east coast)
- **Summit**: Agricultural highlands (mountains)
- **Gateway**: Airport and tourism (west coast)
- **Heartland**: Medical center and power (central)
- **Sterling**: Government coordination (south)

### Intensity Levels

1-10 scale controlling simulation pressure:
- 1-3: Routine monitoring
- 4-5: Growing anxiety
- 6-7: Urgent, alarming
- 8-9: Crisis mode
- 10: Catastrophic

### AI Agents

- **Narrative Agent**: Generates streaming news, social, radio content
- **Consequence Agent**: Determines decision outcomes
- **Tempest Monitor**: Advises CM on team psychological state
- **Values Observer**: Silent tracker of values alignment
- **Report Agent**: Generates post-simulation reports

## Design Principles

1. **The hurricane is the vehicle, not the lesson** — Values conflicts are the lesson
2. **Uncertainty creates pressure** — Don't reveal outcomes too early
3. **Every decision has trade-offs** — No obviously right answers
4. **The gap is data, not failure** — Frame drift as insight
5. **Professional aesthetic** — Command center, not video game

## License

MIT

## Author

Jerry Wolf 
