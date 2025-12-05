// Polyfill Symbol.metadata for Colyseus Schema 3.x ES2022 decorators
(Symbol as unknown as { metadata: symbol }).metadata ??= Symbol('Symbol.metadata');

import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';

import { CrucibleRoom } from './rooms/CrucibleRoom.js';
import { connectDatabase, disconnectDatabase } from './lib/prisma.js';

// Load environment variables
config();

const port = parseInt(process.env.COLYSEUS_PORT || '2567', 10);

async function main() {
  // Connect to database (continue if unavailable)
  try {
    await connectDatabase();
  } catch (error) {
    console.warn('Database connection failed, continuing in memory-only mode:', error);
  }

  // Express app with CORS middleware
  const app = express();

  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || true, // true = reflect request origin
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Health check endpoint for Docker
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Create HTTP server from Express
  const httpServer = createServer(app);

  // Colyseus attaches matchmaking routes and WebSocket upgrade handler
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
    }),
  });

  // Define room type
  gameServer.define('crucible', CrucibleRoom);

  // Start listening
  httpServer.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🌀  THE VALUES CRUCIBLE - Server                           ║
║                                                               ║
║   Colyseus game server running on port ${port}                 ║
║   WebSocket endpoint: ws://localhost:${port}                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await disconnectDatabase();
    gameServer.gracefullyShutdown();
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await disconnectDatabase();
    gameServer.gracefullyShutdown();
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
