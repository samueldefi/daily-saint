import { getSql } from "./db";
import type { Quote } from "./types";

type QuoteRow = {
  id: string;
  text: string;
  author: string;
  feast_day: string;
  scripture: string;
  tags: string;
  used: boolean | number;
  created_at: string;
};

let ready = false;

function mapRow(row: QuoteRow): Quote {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags) as string[];
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    text: row.text,
    author: row.author,
    feastDay: row.feast_day,
    scripture: row.scripture,
    tags,
    used: Boolean(row.used),
    createdAt: row.created_at,
  };
}

export async function ensureQuotesTable(): Promise<void> {
  if (ready) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      author TEXT NOT NULL,
      feast_day TEXT NOT NULL DEFAULT '',
      scripture TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL
    )
  `;
  ready = true;
}

export async function listQuotes(): Promise<Quote[]> {
  await ensureQuotesTable();
  const rows = await getSql()`
    SELECT id, text, author, feast_day, scripture, tags, used, created_at
    FROM quotes
    ORDER BY feast_day ASC, author ASC, created_at DESC
  `;
  return (rows as QuoteRow[]).map(mapRow);
}

export async function insertQuote(quote: Quote): Promise<void> {
  await ensureQuotesTable();
  await getSql()`
    INSERT INTO quotes (id, text, author, feast_day, scripture, tags, used, created_at)
    VALUES (
      ${quote.id},
      ${quote.text},
      ${quote.author},
      ${quote.feastDay},
      ${quote.scripture},
      ${JSON.stringify(quote.tags)},
      ${quote.used},
      ${quote.createdAt}
    )
  `;
}

export async function deleteQuoteRow(id: string): Promise<void> {
  await ensureQuotesTable();
  await getSql()`DELETE FROM quotes WHERE id = ${id}`;
}

export async function setQuoteUsedRow(id: string, used: boolean): Promise<void> {
  await ensureQuotesTable();
  await getSql()`UPDATE quotes SET used = ${used} WHERE id = ${id}`;
}
