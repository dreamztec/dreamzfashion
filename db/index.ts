import { drizzle } from "drizzle-orm/netlify-db";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * In deployed environments NETLIFY_DB_URL is provisioned by the platform and
 * is fully writable. In local `netlify dev` sessions the CLI injects the
 * branch database's read-only connection string; the writable emulated local
 * database (where migrations are applied via `netlify database migrations
 * apply`) is recorded in .netlify/state.json. Local dev therefore prefers the
 * local connection when it is reachable.
 */
function resolveConnectionString(): string | undefined {
  const injected = process.env.NETLIFY_DB_URL;
  if (!injected || !injected.startsWith("postgres")) return undefined;
  // The netlify CLI dev session injects a local emulated database (and sets
  // NETLIFY_DB_DRIVER=server): always prefer the node-postgres driver there —
  // the Neon HTTP client cannot reach a local socket.
  if (process.env.NETLIFY_DB_DRIVER === "server") return injected;
  if (process.env.NODE_ENV !== "development") return injected;
  if (!injected.includes("netlifydb_readonly")) return injected;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const state = require("../.netlify/state.json") as {
      dbConnectionString?: string;
    };
    const local = state.dbConnectionString;
    if (local && local.startsWith("postgres://postgres@localhost")) return local;
  } catch {
    /* fall through to the injected connection */
  }
  return injected;
}

const connectionString = resolveConnectionString();

function localDb() {
  // Local dev: node-postgres against the emulated local database. The generic
  // netlify-db path always builds a Neon HTTP client, which cannot reach a
  // local socket — so we construct the node-postgres driver directly.
  return drizzle({
    client: { driver: "server", pool: new Pool({ connectionString: connectionString! }) } as never,
    schema,
  });
}

// Use the node-postgres server driver for any localhost connection or when
// the platform explicitly signals the server driver; the Neon HTTP client
// everywhere else (deployed = serverless HTTP against Netlify Database).
const isLocalConnection = !!connectionString && /@localhost[:/]|@127\.0\.0\.1[:/]/.test(connectionString);

export const db =
  connectionString && (process.env.NETLIFY_DB_DRIVER === "server" || isLocalConnection)
    ? localDb()
    : connectionString
      ? drizzle({ connection: { connectionString }, schema })
      : drizzle({ schema });
