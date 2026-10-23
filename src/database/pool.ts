import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";

// dev এ hot reload হলে নতুন pool তৈরি না করতে globalThis এ pool রাখা হয়
const globalForPg = globalThis as typeof globalThis & {
  pool?: Pool;
};

// ডাটাবেস লোকাল মেশিনে (localhost) কিনা; অন্য সব হোস্টে (যেমন Neon) এনক্রিপ্টেড সংযোগ বাধ্যতামূলক
function isLocalDatabase(connectionString: string | undefined): boolean {
  try {
    const host = new URL(connectionString ?? "").hostname;

    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

// সার্ভারলেসে প্রতিটি instance এর কানেকশন কম রাখা হয়, যাতে Neon এর সংযোগ সীমা ফুরিয়ে না যায় (.env: DATABASE_POOL_MAX)
function getPoolMax(): number {
  const value = Number(process.env.DATABASE_POOL_MAX);

  return Number.isInteger(value) && value >= 1 && value <= 20 ? value : isProduction ? 3 : 10;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  const instance = new Pool({
    connectionString,

    // Neon এর জন্য TLS সবসময় চালু এবং সার্টিফিকেট যাচাইসহ (rejectUnauthorized: true), তাই মাঝপথে আড়ি পাতা বা নকল সার্ভার সম্ভব নয়
    ssl: isLocalDatabase(connectionString) ? false : { rejectUnauthorized: true },

    max: getPoolMax(),
    idleTimeoutMillis: 10_000,

    // Neon ঘুম থেকে উঠতে (cold start) সময় নেয়, তাই টাইমআউট বেশি রাখা হয়েছে
    connectionTimeoutMillis: 15_000,

    // কোনো কুয়েরি আটকে গেলে যেন কানেকশন চিরকাল দখল না থাকে
    statement_timeout: 15_000,
  });

  // idle কানেকশনে এরর হলে যেন অ্যাপ ক্র্যাশ না করে
  instance.on("error", (error) => {
    console.error("Unexpected database pool error:", error);
  });

  return instance;
}

const pool = globalForPg.pool ?? createPool();

// প্রোডাকশনেও pool টি globalThis এ রাখা হয়, যাতে একই serverless instance এ বারবার নতুন pool না খোলে
globalForPg.pool = pool;

export default pool;
