"use server";

import { MissingDatabaseError, quotesAreDurable } from "./db";
import { parseQuoteImport, quotesEqual, toExportJson } from "./parse-quotes";
import {
  deleteQuoteRow,
  insertQuote,
  listQuotes,
  setQuoteUsedRow,
} from "./quotes-repo";
import type { Quote } from "./types";

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function parseTags(tags: string) {
  return tags
    .split(/[,;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function getQuotePersistence() {
  return { durable: quotesAreDurable() };
}

export async function getQuotes(): Promise<Quote[]> {
  try {
    return await listQuotes();
  } catch (error) {
    if (error instanceof MissingDatabaseError) return [];
    throw error;
  }
}

export async function addQuote(input: {
  text: string;
  author: string;
  feastDay: string;
  scripture: string;
  tags: string;
}) {
  const text = input.text.trim();
  const author = input.author.trim();
  if (!text || !author) {
    return { ok: false as const, error: "Quote text and author are required." };
  }

  const quote: Quote = {
    id: id(),
    text,
    author,
    feastDay: input.feastDay.trim(),
    scripture: input.scripture.trim(),
    tags: parseTags(input.tags),
    used: false,
    createdAt: now(),
  };

  try {
    const existing = await listQuotes();
    const duplicate = existing.find((item) => quotesEqual(item, quote));
    if (duplicate) {
      return {
        ok: false as const,
        error: "This quote is already in the library.",
        duplicate,
      };
    }

    await insertQuote(quote);
    return { ok: true as const, id: quote.id };
  } catch (error) {
    if (error instanceof MissingDatabaseError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function ingestQuotes(raw: string) {
  let drafts;
  try {
    drafts = parseQuoteImport(raw);
  } catch {
    return {
      ok: false as const,
      error: "Could not parse that file. Use JSON or one quote | author per line.",
    };
  }
  if (drafts.length === 0) {
    return { ok: false as const, error: "No quotes found." };
  }

  try {
    const existing = await listQuotes();
    let added = 0;
    const duplicates: Quote[] = [];

    for (const draft of drafts) {
      const match = existing.find((item) => quotesEqual(item, draft));
      if (match) {
        duplicates.push(match);
        continue;
      }
      const quote: Quote = {
        id: id(),
        text: draft.text,
        author: draft.author,
        feastDay: draft.feastDay,
        scripture: draft.scripture,
        tags: draft.tags,
        used: false,
        createdAt: now(),
      };
      await insertQuote(quote);
      existing.unshift(quote);
      added += 1;
    }

    return {
      ok: true as const,
      added,
      skipped: duplicates.length,
      duplicates,
    };
  } catch (error) {
    if (error instanceof MissingDatabaseError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function deleteQuote(quoteId: string) {
  await deleteQuoteRow(quoteId);
}

export async function setQuoteUsed(quoteId: string, used: boolean) {
  await setQuoteUsedRow(quoteId, used);
}

export async function exportQuotesJson() {
  return JSON.stringify(toExportJson(await listQuotes()), null, 2);
}
