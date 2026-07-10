import "server-only";
import { Pool, types } from "pg";

// Return DATE columns as "YYYY-MM-DD" strings, matching what PostgREST used
// to send — the app compares dates with plain string ordering.
types.setTypeParser(types.builtins.DATE, (v) => v);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing from env");
}

const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const db =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

globalForDb.pgPool = db;
