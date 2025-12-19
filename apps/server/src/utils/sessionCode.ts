// =============================================================================
// SECURE SESSION CODE GENERATOR
// =============================================================================
//
// Generates cryptographically secure session codes for Crucible sessions.
//
// Security Analysis:
// - 8 chars from 32-char set: 32^8 = 1,099,511,627,776 combinations
// - With rate limiting (3 attempts/min, 30-min block): ~47 years to brute force
// - Excludes ambiguous characters (0, O, 1, I, L) for readability
//
// =============================================================================

import { randomBytes } from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

// Exclude ambiguous characters: 0, O, 1, I, L
const DEFAULT_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHARSET = process.env.SESSION_CODE_CHARSET || DEFAULT_CHARSET;
const CODE_LENGTH = parseInt(process.env.SESSION_CODE_LENGTH || '8');

// =============================================================================
// SESSION CODE GENERATOR
// =============================================================================

/**
 * Generate a cryptographically secure session code
 *
 * Uses crypto.randomBytes for true randomness, not Math.random
 *
 * @returns Uppercase session code (e.g., "ABCD1234")
 */
export function generateSessionCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i++) {
    // Use modulo to select from charset
    // Note: This has slight bias but is negligible for our use case
    code += CHARSET[bytes[i] % CHARSET.length];
  }

  return code;
}

/**
 * Generate a session code with collision check callback
 *
 * @param isUnique Async function to check if code is unique
 * @param maxAttempts Maximum attempts before throwing
 * @returns Unique session code
 */
export async function generateUniqueSessionCode(
  isUnique: (code: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateSessionCode();
    if (await isUnique(code)) {
      return code;
    }
  }

  throw new Error(
    `Failed to generate unique session code after ${maxAttempts} attempts`
  );
}

/**
 * Validate session code format
 *
 * @param code Session code to validate
 * @returns true if code matches expected format
 */
export function isValidSessionCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  if (code.length !== CODE_LENGTH) {
    return false;
  }

  // Check all characters are in charset
  for (const char of code.toUpperCase()) {
    if (!CHARSET.includes(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize a session code (uppercase, trim)
 *
 * @param code Raw session code input
 * @returns Normalized code or null if invalid
 */
export function normalizeSessionCode(code: string): string | null {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const normalized = code.trim().toUpperCase();

  if (!isValidSessionCodeFormat(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Get session code configuration info
 */
export function getSessionCodeConfig(): {
  length: number;
  charset: string;
  combinations: number;
} {
  return {
    length: CODE_LENGTH,
    charset: CHARSET,
    combinations: Math.pow(CHARSET.length, CODE_LENGTH),
  };
}
