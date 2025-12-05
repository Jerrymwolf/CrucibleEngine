/**
 * Session code utilities
 */

const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusable chars: I, O, 0, 1

/**
 * Generate a random 6-character session code
 */
export function generateSessionCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
    code += ALLOWED_CHARS[randomIndex];
  }
  return code;
}

/**
 * Validate a session code format
 */
export function validateSessionCode(code: string): boolean {
  if (code.length !== 6) return false;

  const upperCode = code.toUpperCase();
  for (const char of upperCode) {
    if (!ALLOWED_CHARS.includes(char)) return false;
  }

  return true;
}

/**
 * Normalize a session code (uppercase, trim)
 */
export function normalizeSessionCode(code: string): string {
  return code.trim().toUpperCase();
}
