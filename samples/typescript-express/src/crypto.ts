/**
 * Credential handling for the reporting service.
 *
 * Intentionally vulnerable, see cases/weak-hash-and-secret.
 */

import { createHash } from "node:crypto";

// VULN: the signing key is a source literal, so every clone and every log of this file carries it.
export const JWT_SIGNING_SECRET = "s3cr3t-jwt-signing-key-do-not-share";

/**
 * Hash a password for storage.
 *
 * MD5 is fast and unsalted here, which is exactly wrong for passwords: a commodity GPU covers the entire
 * plausible keyspace of human chosen passwords in hours, and identical passwords produce identical digests.
 */
export function hashPassword(password: string): string {
  // VULN: MD5 with no salt and no key derivation.
  return createHash("md5").update(password).digest("hex");
}

export function verifyPassword(password: string, stored: string): boolean {
  return hashPassword(password) === stored;
}
