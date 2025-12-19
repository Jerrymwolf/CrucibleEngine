import { Client } from '@colyseus/core';
import * as jose from 'jose';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedClient {
  userId: string;
  role: 'cm' | 'participant' | 'spectator';
  teamId?: string;
  sessionCode: string;
  authenticatedAt: number;
  tokenExpiry?: number;
}

interface AuthMessage {
  type: 'auth';
  clerkToken?: string;        // JWT for CM users
  participantToken?: string;  // pt_xxx for anonymous
  sessionCode: string;
  teamId?: string;
  role?: 'participant' | 'spectator';
}

interface ClerkJWTPayload {
  sub: string;
  exp: number;
  iat: number;
  iss: string;
  azp?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AUTH_TIMEOUT_MS = 10_000; // 10 seconds to authenticate
const TOKEN_REFRESH_BUFFER_MS = 30_000; // Refresh 30s before expiry

// =============================================================================
// JWKS CACHE
// =============================================================================

let jwksCache: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600_000; // 1 hour

async function getJWKS(): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();
  if (jwksCache && now - jwksCacheTime < JWKS_CACHE_TTL) {
    return jwksCache;
  }

  const jwksUrl = process.env.CLERK_JWKS_URL;
  if (!jwksUrl) {
    throw new Error('CLERK_JWKS_URL not configured');
  }

  jwksCache = jose.createRemoteJWKSet(new URL(jwksUrl));
  jwksCacheTime = now;
  return jwksCache;
}

// =============================================================================
// WEBSOCKET AUTH CLASS
// =============================================================================

export class WebSocketAuth {
  private authenticatedClients = new Map<string, AuthenticatedClient>();
  private pendingAuth = new Map<string, NodeJS.Timeout>();
  private refreshTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Start authentication timeout for new client
   */
  startAuthTimeout(client: Client, onTimeout: () => void): void {
    const timeout = setTimeout(() => {
      if (!this.isAuthenticated(client.sessionId)) {
        console.warn(`[AUTH] Client ${client.sessionId} failed to authenticate within ${AUTH_TIMEOUT_MS}ms`);
        onTimeout();
      }
    }, AUTH_TIMEOUT_MS);

    this.pendingAuth.set(client.sessionId, timeout);
  }

  /**
   * Authenticate a client based on their auth message
   */
  async authenticate(
    client: Client,
    message: AuthMessage,
    validateSession: (code: string) => Promise<{ valid: boolean; cmUserId?: string }>
  ): Promise<AuthenticatedClient | null> {
    // Clear pending timeout
    this.clearPendingTimeout(client.sessionId);

    try {
      // Validate session code first
      const sessionValidation = await validateSession(message.sessionCode);
      if (!sessionValidation.valid) {
        console.warn(`[AUTH] Invalid session code: ${message.sessionCode}`);
        return null;
      }

      // CM authentication (Clerk JWT)
      if (message.clerkToken) {
        return await this.authenticateCM(client, message, sessionValidation.cmUserId);
      }

      // Participant authentication (anonymous token)
      if (message.participantToken) {
        return this.authenticateParticipant(client, message);
      }

      // Spectator (no token needed, just valid session)
      if (message.role === 'spectator') {
        return this.authenticateSpectator(client, message);
      }

      console.warn(`[AUTH] No valid authentication method provided`);
      return null;
    } catch (error) {
      console.error(`[AUTH] Authentication failed:`, error);
      return null;
    }
  }

  private async authenticateCM(
    client: Client,
    message: AuthMessage,
    expectedCMUserId?: string
  ): Promise<AuthenticatedClient | null> {
    // Check if Clerk is configured
    const jwksUrl = process.env.CLERK_JWKS_URL;
    if (!jwksUrl) {
      // Fallback: decode JWT without verification (dev mode)
      console.warn('[AUTH] CLERK_JWKS_URL not set - using unverified JWT decode (dev mode only)');
      return this.authenticateCMUnverified(client, message, expectedCMUserId);
    }

    try {
      const jwks = await getJWKS();
      const issuer = process.env.CLERK_ISSUER;

      const { payload } = await jose.jwtVerify(message.clerkToken!, jwks, {
        issuer,
        algorithms: ['RS256'],
      });

      const clerkPayload = payload as unknown as ClerkJWTPayload;

      // Verify this is the CM for this session (if we know who it should be)
      if (expectedCMUserId && clerkPayload.sub !== expectedCMUserId) {
        console.warn(`[AUTH] CM user mismatch: expected ${expectedCMUserId}, got ${clerkPayload.sub}`);
        return null;
      }

      const authClient: AuthenticatedClient = {
        userId: clerkPayload.sub,
        role: 'cm',
        sessionCode: message.sessionCode,
        authenticatedAt: Date.now(),
        tokenExpiry: clerkPayload.exp * 1000,
      };

      this.authenticatedClients.set(client.sessionId, authClient);
      this.scheduleTokenRefresh(client, authClient);

      console.log(`[AUTH] CM authenticated: ${clerkPayload.sub}`);
      return authClient;
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        console.warn(`[AUTH] Clerk token expired`);
      } else {
        console.error(`[AUTH] Clerk JWT verification failed:`, error);
      }
      return null;
    }
  }

  private authenticateCMUnverified(
    client: Client,
    message: AuthMessage,
    expectedCMUserId?: string
  ): AuthenticatedClient | null {
    try {
      // Decode JWT without verification (DEV MODE ONLY)
      const parts = message.clerkToken!.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.warn('[AUTH] Token expired');
        return null;
      }

      // Verify CM if expected
      if (expectedCMUserId && payload.sub !== expectedCMUserId) {
        console.warn(`[AUTH] CM user mismatch: expected ${expectedCMUserId}, got ${payload.sub}`);
        return null;
      }

      const authClient: AuthenticatedClient = {
        userId: payload.sub,
        role: 'cm',
        sessionCode: message.sessionCode,
        authenticatedAt: Date.now(),
        tokenExpiry: payload.exp ? payload.exp * 1000 : undefined,
      };

      this.authenticatedClients.set(client.sessionId, authClient);
      if (authClient.tokenExpiry) {
        this.scheduleTokenRefresh(client, authClient);
      }

      console.log(`[AUTH] CM authenticated (unverified): ${payload.sub}`);
      return authClient;
    } catch {
      return null;
    }
  }

  private authenticateParticipant(
    client: Client,
    message: AuthMessage
  ): AuthenticatedClient | null {
    // Validate participant token format
    if (!message.participantToken?.startsWith('pt_') || message.participantToken.length < 24) {
      console.warn(`[AUTH] Invalid participant token format`);
      return null;
    }

    const authClient: AuthenticatedClient = {
      userId: message.participantToken,
      role: 'participant',
      teamId: message.teamId,
      sessionCode: message.sessionCode,
      authenticatedAt: Date.now(),
    };

    this.authenticatedClients.set(client.sessionId, authClient);
    console.log(`[AUTH] Participant authenticated: ${message.participantToken.slice(0, 10)}...`);
    return authClient;
  }

  private authenticateSpectator(
    client: Client,
    message: AuthMessage
  ): AuthenticatedClient {
    const authClient: AuthenticatedClient = {
      userId: `spectator_${client.sessionId}`,
      role: 'spectator',
      sessionCode: message.sessionCode,
      authenticatedAt: Date.now(),
    };

    this.authenticatedClients.set(client.sessionId, authClient);
    console.log(`[AUTH] Spectator authenticated for session: ${message.sessionCode}`);
    return authClient;
  }

  private scheduleTokenRefresh(client: Client, authClient: AuthenticatedClient): void {
    if (!authClient.tokenExpiry) return;

    const refreshIn = authClient.tokenExpiry - Date.now() - TOKEN_REFRESH_BUFFER_MS;
    if (refreshIn <= 0) return;

    const timer = setTimeout(() => {
      client.send('token_refresh_needed', {});
    }, refreshIn);

    this.refreshTimers.set(client.sessionId, timer);
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(sessionId: string): boolean {
    return this.authenticatedClients.has(sessionId);
  }

  /**
   * Get authenticated client info
   */
  getClient(sessionId: string): AuthenticatedClient | undefined {
    return this.authenticatedClients.get(sessionId);
  }

  /**
   * Require specific role(s) for an action
   */
  requireRole(sessionId: string, allowedRoles: AuthenticatedClient['role'][]): boolean {
    const client = this.authenticatedClients.get(sessionId);
    if (!client) return false;
    return allowedRoles.includes(client.role);
  }

  /**
   * Remove client on disconnect
   */
  removeClient(sessionId: string): void {
    this.authenticatedClients.delete(sessionId);
    this.clearPendingTimeout(sessionId);

    const refreshTimer = this.refreshTimers.get(sessionId);
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      this.refreshTimers.delete(sessionId);
    }
  }

  private clearPendingTimeout(sessionId: string): void {
    const timeout = this.pendingAuth.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingAuth.delete(sessionId);
    }
  }
}

export const wsAuth = new WebSocketAuth();
