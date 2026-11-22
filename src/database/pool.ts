import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";

const globalForPg = globalThis as typeof globalThis & {
  pool?: Pool;
};

function isLocalDatabase(connectionString: string | undefined): boolean {
  try {
    const host = new URL(connectionString ?? "").hostname;

    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function getPoolMax(): number {
  const value = Number(process.env.DATABASE_POOL_MAX);

  return Number.isInteger(value) && value >= 1 && value <= 20 ? value : isProduction ? 3 : 10;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  const instance = new Pool({
    connectionString,
    ssl: isLocalDatabase(connectionString) ? false : { rejectUnauthorized: true },

    max: getPoolMax(),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 15_000,
  });

  instance.on("error", (error) => {
    console.error("Unexpected database pool error:", error);
  });

  return instance;
}

const pool = globalForPg.pool ?? createPool();
globalForPg.pool = pool;

export default pool;
