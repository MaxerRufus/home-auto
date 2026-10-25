import crypto from 'crypto';

/**
 * Generates a high-entropy random hex token for device registration (32 bytes = 64 hex characters)
 */
export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes SHA-256 hex hash of a device secret token
 */
export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Validates a plaintext token against a stored SHA-256 hash
 */
export function verifyDeviceToken(token: string, storedHash: string): boolean {
  if (!token || !storedHash) return false;
  const hash = hashDeviceToken(token);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}
