// =============================================================================
// PARTICIPANT TOKEN MANAGEMENT
// =============================================================================
//
// Manages anonymous participant tokens stored in localStorage.
// Tokens are used to identify participants who join without a Clerk account.
// Can be linked to a Clerk account later for persistent identity.
//
// Token format: pt_[21 char nanoid] (e.g., "pt_V1StGXR8_Z5jdHi6B-myT")
//
// =============================================================================

import { nanoid } from 'nanoid';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'crucible_participant_token';
const TOKEN_PREFIX = 'pt_';
const TOKEN_LENGTH = 21;

// =============================================================================
// TYPES
// =============================================================================

export interface ParticipantToken {
  /** Unique token ID (pt_xxx format) */
  id: string;
  /** When the token was created */
  createdAt: number;
  /** Session codes this token has joined */
  sessions: string[];
  /** When the token was last used */
  lastUsed: number;
  /** Whether this token has been linked to a Clerk account */
  linked?: boolean;
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

/**
 * Get or create a participant token
 *
 * Returns existing token from localStorage if valid,
 * otherwise creates a new one.
 */
export function getParticipantToken(): ParticipantToken {
  if (typeof window === 'undefined') {
    // Server-side: return a temporary token (won't be persisted)
    return createToken();
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const token = JSON.parse(stored) as ParticipantToken;
      if (isValidToken(token)) {
        return token;
      }
    } catch {
      // Invalid stored token - will create new one
    }
  }

  const token = createToken();
  saveToken(token);
  return token;
}

/**
 * Create a new participant token
 */
function createToken(): ParticipantToken {
  return {
    id: `${TOKEN_PREFIX}${nanoid(TOKEN_LENGTH)}`,
    createdAt: Date.now(),
    sessions: [],
    lastUsed: Date.now(),
  };
}

/**
 * Validate token format
 */
function isValidToken(token: ParticipantToken): boolean {
  return (
    typeof token.id === 'string' &&
    token.id.startsWith(TOKEN_PREFIX) &&
    token.id.length === TOKEN_PREFIX.length + TOKEN_LENGTH &&
    typeof token.createdAt === 'number' &&
    Array.isArray(token.sessions)
  );
}

/**
 * Save token to localStorage
 */
function saveToken(token: ParticipantToken): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

/**
 * Record that this token joined a session
 */
export function recordSessionJoin(sessionCode: string): void {
  if (typeof window === 'undefined') return;

  const token = getParticipantToken();
  const normalizedCode = sessionCode.toUpperCase();

  if (!token.sessions.includes(normalizedCode)) {
    token.sessions.push(normalizedCode);
  }
  token.lastUsed = Date.now();
  saveToken(token);
}

/**
 * Check if token has joined a specific session before
 */
export function hasJoinedSession(sessionCode: string): boolean {
  const token = getParticipantToken();
  return token.sessions.includes(sessionCode.toUpperCase());
}

/**
 * Get all sessions this token has joined
 */
export function getJoinedSessions(): string[] {
  const token = getParticipantToken();
  return [...token.sessions];
}

/**
 * Link anonymous token to authenticated Clerk account
 *
 * This transfers session history to the user's account,
 * enabling persistent identity across devices.
 */
export async function linkToAccount(clerkUserId: string): Promise<boolean> {
  const token = getParticipantToken();

  try {
    const response = await fetch('/api/auth/link-participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: token.id,
        clerkUserId,
      }),
    });

    if (response.ok) {
      // Mark token as linked
      token.linked = true;
      saveToken(token);

      const data = await response.json();
      console.log(`[Auth] Linked ${token.sessions.length} sessions to account`);
      return true;
    }

    console.warn('[Auth] Failed to link account:', await response.text());
    return false;
  } catch (error) {
    console.error('[Auth] Failed to link account:', error);
    return false;
  }
}

/**
 * Clear participant token (for testing or logout)
 */
export function clearParticipantToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get the raw token ID (for WebSocket auth)
 */
export function getTokenId(): string {
  return getParticipantToken().id;
}

/**
 * Check if token is linked to an account
 */
export function isTokenLinked(): boolean {
  const token = getParticipantToken();
  return !!token.linked;
}
