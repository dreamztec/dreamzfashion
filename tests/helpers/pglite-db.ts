import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../db/schema";

/**
 * In-memory Postgres with every repository migration applied in order —
 * the same SQL the platform applies to Netlify Database. Used by tests that
 * exercise real queries (pricing, attribution, commission ledger).
 */
export async function createTestDb() {
  const client = new PGlite();
  const dir = path.resolve(__dirname, "../../netlify/database/migrations");
  const entries = fs.readdirSync(dir).sort();
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const file = fs.statSync(full).isDirectory() ? path.join(full, "migration.sql") : full;
    if (!file.endsWith(".sql") || !fs.existsSync(file)) continue;
    const sql = fs.readFileSync(file, "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement);
    }
  }
  return { client, db: drizzle({ client, schema }) };
}
