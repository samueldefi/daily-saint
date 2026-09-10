import type { Quote } from "./types";

function asQuote(value: unknown): Quote | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const text = record.text ?? record.quote;
  const saint = record.saint ?? record.author ?? record.name;
  if (typeof text !== "string" || typeof saint !== "string") return null;
  return { text: text.trim(), saint: saint.trim() };
}

export function parseQuotesJson(raw: unknown): Quote[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { quotes?: unknown }).quotes)
      ? (raw as { quotes: unknown[] }).quotes
      : null;

  if (!list) {
    throw new Error("JSON must be { quotes: [...] }");
  }

  const quotes = list.map(asQuote).filter((item): item is Quote => item !== null);
  if (!quotes.length) {
    throw new Error("No quotes found in JSON");
  }
  return quotes;
}
