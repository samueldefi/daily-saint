import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null | undefined;

export class MissingDatabaseError extends Error {
  constructor() {
    super("Set DATABASE_URL from the Neon integration, then redeploy.");
    this.name = "MissingDatabaseError";
  }
}

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL
  );
}

export function quotesAreDurable(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getSql(): Sql {
  if (sql === undefined) {
    const url = getDatabaseUrl();
    sql = url ? neon(url) : null;
  }
  if (!sql) throw new MissingDatabaseError();
  return sql;
}
