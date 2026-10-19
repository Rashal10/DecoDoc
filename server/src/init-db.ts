import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config";

const __dirname = dirname(fileURLToPath(import.meta.url));

let pool: pg.Pool | null = null;
let databaseReady = false;

export function isDatabaseReady(): boolean {
  return databaseReady;
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 60_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    });
  }
  return pool;
}

export function getDb() {
  return drizzle(getPool());
}

export async function initDatabase(): Promise<void> {
  const migrationsFolder = resolve(__dirname, "../drizzle");
  console.log("[DecoDoc Server] Connecting to the database");
  const db = getDb();
  await migrate(db, { migrationsFolder });
  await getPool().query("delete from anonymous_sessions where expires_at < now()");
  databaseReady = true;
  console.log("[DecoDoc Server] Database ready");
}

export async function closeDatabase(): Promise<void> {
  databaseReady = false;
  if (pool) {
    await pool.end();
    pool = null;
  }
}
