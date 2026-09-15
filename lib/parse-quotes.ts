import type { Quote } from "./types";

export type QuoteDraft = {
  text: string;
  author: string;
  feastDay: string;
  scripture: string;
  tags: string[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeFeastDay(value: string): string {
  const match = value.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (!match) return value;
  return `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function fromObject(raw: Record<string, unknown>): QuoteDraft | null {
  const text = asString(raw.text ?? raw.quote ?? raw.description);
  const author = asString(raw.author ?? raw.saint ?? raw.name);
  if (!text || !author) return null;
  return {
    text,
    author,
    feastDay: normalizeFeastDay(asString(raw.feastDay ?? raw.feast_day ?? raw.date)),
    scripture: asString(raw.scripture ?? raw.reference ?? raw.ref),
    tags: asTags(raw.tags ?? raw.tag),
  };
}

function fromLine(line: string): QuoteDraft | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const separators = [" | ", "\t", " — ", " – ", " -- "];
  for (const sep of separators) {
    const at = trimmed.lastIndexOf(sep);
    if (at > 0) {
      const text = trimmed.slice(0, at).trim();
      const rest = trimmed.slice(at + sep.length).trim();
      if (text && rest) {
        return { text, author: rest, feastDay: "", scripture: "", tags: [] };
      }
    }
  }
  return null;
}

export function parseQuoteImport(raw: string): QuoteDraft[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed) as unknown;
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "quotes" in data
        ? (data as { quotes: unknown }).quotes
        : [];
    if (!Array.isArray(list)) return [];
    return list
      .map((item) =>
        item && typeof item === "object"
          ? fromObject(item as Record<string, unknown>)
          : null,
      )
      .filter((item): item is QuoteDraft => item !== null);
  }

  return trimmed
    .split(/\r?\n/)
    .map(fromLine)
    .filter((item): item is QuoteDraft => item !== null);
}

export function quotesEqual(
  a: Pick<Quote, "text" | "author">,
  b: Pick<Quote, "text" | "author">,
) {
  return (
    a.text.trim().toLowerCase() === b.text.trim().toLowerCase() &&
    a.author.trim().toLowerCase() === b.author.trim().toLowerCase()
  );
}

export function toExportJson(quotes: Quote[]) {
  return {
    quotes: quotes.map((quote) => ({
      text: quote.text,
      saint: quote.author,
      feastDay: quote.feastDay,
      scripture: quote.scripture,
      tags: quote.tags,
    })),
  };
}
