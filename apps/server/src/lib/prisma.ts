import { PrismaClient } from '../../generated/prisma/index.js';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.log('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
