import type { PoolClient } from "pg";
import pool from "./pool";

// callback সফল হলে COMMIT, এরর হলে ROLLBACK করে কানেকশন সবসময় ছেড়ে দেয়
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);

    throw error;
  } finally {
    client.release();
  }
}

// PostgreSQL এর unique constraint লঙ্ঘনের এরর কোড (23505) চেনার ফাংশন
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
