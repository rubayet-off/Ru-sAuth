import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

import { AUTH_CONFIG } from "./authConfig";

let dummyHash: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(randomUUID(), AUTH_CONFIG.bcryptRounds);

  return dummyHash;
}

/**
 * Compares a password against a stored hash. When there is no hash (unknown
 * email, Google-only account) it still spends the same bcrypt time, so the
 * response time does not reveal whether an account exists.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  if (!passwordHash) {
    await bcrypt.compare(password, await getDummyHash());
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
}
