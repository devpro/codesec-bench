/**
 * Correct counterpart of src/crypto.ts.
 *
 * Same exports, same call shapes, same names.
 * The secret comes from the environment and the hash is a salted key derivation function.
 *
 * Any finding reported in this file is a false positive.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const JWT_SIGNING_SECRET = process.env.JWT_SIGNING_SECRET ?? "";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);

  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, derivedHex] = stored.split(":");
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 64);

  return timingSafeEqual(derived, Buffer.from(derivedHex, "hex"));
}
