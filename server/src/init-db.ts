import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config";

const __dirname = dirname(fileURLToPath(import.meta.url));

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

export function getDb() {
  return drizzle(getPool());
}

export async function initDatabase(): Promise<void> {
  const migrationsFolder = resolve(__dirname, "../drizzle");
  const db = getDb();
  await migrate(db, { migrationsFolder });
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
