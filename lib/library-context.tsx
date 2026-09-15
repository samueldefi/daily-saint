"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  addQuote as addQuoteRecord,
  deleteQuote as deleteQuoteRecord,
  exportQuotesJson,
  getQuotePersistence,
  getQuotes,
  ingestQuotes,
  setQuoteUsed as setQuoteUsedRecord,
} from "./quote-actions";
import {
  loadFont,
  loadLocalQuotes,
  loadPhotos,
  loadSettings,
  putFont,
  putPhoto,
  removeFont,
  removePhoto,
  saveLocalQuotes,
  saveSettingsRecord,
  type PhotoRecord,
} from "./idb";
import { parseQuoteImport, quotesEqual } from "./parse-quotes";
import { defaultSettings, type Photo, type Quote, type Settings } from "./types";

type LibraryPhoto = Photo & { url: string };

type Library = {
  ready: boolean;
  durableQuotes: boolean;
  quotes: Quote[];
  photos: LibraryPhoto[];
  settings: Settings;
  quoteFontUrl: string;
  authorFontUrl: string;
  addQuote: (input: {
    text: string;
    author: string;
    feastDay: string;
    scripture: string;
    tags: string;
  }) => Promise<{ ok: true } | { ok: false; error: string; duplicate?: Quote }>;
  importQuotes: (
    raw: string,
  ) => Promise<
    | { ok: true; added: number; skipped: number; duplicates: Quote[] }
    | { ok: false; error: string }
  >;
  deleteQuote: (id: string) => Promise<void>;
  setQuoteUsed: (id: string, used: boolean) => Promise<void>;
  exportQuotes: () => Promise<string>;
  uploadPhotos: (files: File[]) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  setPhotoUsed: (id: string, used: boolean) => Promise<void>;
  markPairUsed: (quoteId: string, photoId: string) => Promise<void>;
  saveLook: (
    input: Pick<Settings, "overlayColor" | "overlayOpacity" | "greyscale" | "grainIntensity">,
  ) => Promise<void>;
  uploadFont: (slot: "quote" | "author", file: File) => Promise<void>;
  resetFont: (slot: "quote" | "author") => Promise<void>;
};

const LibraryContext = createContext<Library | null>(null);

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [durableQuotes, setDurableQuotes] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [photos, setPhotos] = useState<LibraryPhoto[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [quoteFontUrl, setQuoteFontUrl] = useState("/fonts/quote.woff2");
  const [authorFontUrl, setAuthorFontUrl] = useState("/fonts/author.woff2");
  const photoUrls = useRef<string[]>([]);
  const fontUrls = useRef<{ quote?: string; author?: string }>({});

  const refresh = useCallback(async () => {
    try {
      let durable = false;
      try {
        durable = (await getQuotePersistence()).durable;
      } catch {
        durable = false;
      }
      const [nextQuotes, nextPhotos, nextSettings, quoteFont, authorFont] = await Promise.all([
        durable ? getQuotes() : loadLocalQuotes(),
        loadPhotos(),
        loadSettings(),
        loadFont("quote"),
        loadFont("author"),
      ]);

    photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
    const mapped = nextPhotos.map((photo: PhotoRecord) => {
      const url = URL.createObjectURL(photo.blob);
      return { ...photo, url };
    });
    photoUrls.current = mapped.map((photo) => photo.url);
    setPhotos(mapped);

    if (fontUrls.current.quote) URL.revokeObjectURL(fontUrls.current.quote);
    if (fontUrls.current.author) URL.revokeObjectURL(fontUrls.current.author);
    const nextQuoteFont = quoteFont
      ? URL.createObjectURL(quoteFont.blob)
      : "/fonts/quote.woff2";
    const nextAuthorFont = authorFont
      ? URL.createObjectURL(authorFont.blob)
      : "/fonts/author.woff2";
    fontUrls.current = {
      quote: quoteFont ? nextQuoteFont : undefined,
      author: authorFont ? nextAuthorFont : undefined,
    };

    setQuotes(nextQuotes);
    setSettings(nextSettings);
    setDurableQuotes(durable);
    setQuoteFontUrl(nextQuoteFont);
    setAuthorFontUrl(nextAuthorFont);
    setReady(true);
    } catch (error) {
      console.error("Library failed to load", error);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
      if (fontUrls.current.quote) URL.revokeObjectURL(fontUrls.current.quote);
      if (fontUrls.current.author) URL.revokeObjectURL(fontUrls.current.author);
    };
  }, [refresh]);

  const value: Library = {
    ready,
    durableQuotes,
    quotes,
    photos,
    settings,
    quoteFontUrl,
    authorFontUrl,
    async addQuote(input) {
      if (!durableQuotes) {
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
          tags: input.tags
            .split(/[,;]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          used: false,
          createdAt: now(),
        };
        const existing = await loadLocalQuotes();
        const duplicate = existing.find((item) => quotesEqual(item, quote));
        if (duplicate) {
          return {
            ok: false as const,
            error: "This quote is already in the library.",
            duplicate,
          };
        }
        await saveLocalQuotes([quote, ...existing]);
        await refresh();
        return { ok: true as const };
      }
      const result = await addQuoteRecord(input);
      if (result.ok) await refresh();
      return result;
    },
    async importQuotes(raw) {
      if (!durableQuotes) {
        let drafts;
        try {
          drafts = parseQuoteImport(raw);
        } catch {
          return {
            ok: false as const,
            error: "Could not parse that file. Use JSON or one quote | author per line.",
          };
        }
        if (!drafts.length) return { ok: false as const, error: "No quotes found." };
        const existing = await loadLocalQuotes();
        let added = 0;
        const duplicates: Quote[] = [];
        const next = [...existing];
        for (const draft of drafts) {
          const match = next.find((item) => quotesEqual(item, draft));
          if (match) {
            duplicates.push(match);
            continue;
          }
          next.unshift({
            id: id(),
            text: draft.text,
            author: draft.author,
            feastDay: draft.feastDay,
            scripture: draft.scripture,
            tags: draft.tags,
            used: false,
            createdAt: now(),
          });
          added += 1;
        }
        await saveLocalQuotes(next);
        await refresh();
        return { ok: true as const, added, skipped: duplicates.length, duplicates };
      }
      const result = await ingestQuotes(raw);
      if (result.ok) await refresh();
      return result;
    },
    async deleteQuote(quoteId) {
      if (!durableQuotes) {
        await saveLocalQuotes((await loadLocalQuotes()).filter((quote) => quote.id !== quoteId));
      } else {
        await deleteQuoteRecord(quoteId);
      }
      await refresh();
    },
    async setQuoteUsed(quoteId, used) {
      if (!durableQuotes) {
        await saveLocalQuotes(
          (await loadLocalQuotes()).map((quote) =>
            quote.id === quoteId ? { ...quote, used } : quote,
          ),
        );
      } else {
        await setQuoteUsedRecord(quoteId, used);
      }
      await refresh();
    },
    async exportQuotes() {
      if (!durableQuotes) {
        const { toExportJson } = await import("./parse-quotes");
        return JSON.stringify(toExportJson(await loadLocalQuotes()), null, 2);
      }
      return exportQuotesJson();
    },
    async uploadPhotos(files) {
      for (const file of files) {
        await putPhoto({
          id: id(),
          filename: file.name,
          originalName: file.name,
          mime: file.type || "image/jpeg",
          used: false,
          createdAt: now(),
          blob: file,
        });
      }
      await refresh();
    },
    async deletePhoto(photoId) {
      await removePhoto(photoId);
      await refresh();
    },
    async setPhotoUsed(photoId, used) {
      const photosNow = await loadPhotos();
      const photo = photosNow.find((item) => item.id === photoId);
      if (photo) await putPhoto({ ...photo, used });
      await refresh();
    },
    async markPairUsed(quoteId, photoId) {
      if (!durableQuotes) {
        await saveLocalQuotes(
          (await loadLocalQuotes()).map((quote) =>
            quote.id === quoteId ? { ...quote, used: true } : quote,
          ),
        );
      } else {
        await setQuoteUsedRecord(quoteId, true);
      }
      const photosNow = await loadPhotos();
      const photo = photosNow.find((item) => item.id === photoId);
      if (photo) await putPhoto({ ...photo, used: true });
      await refresh();
    },
    async saveLook(input) {
      const current = await loadSettings();
      await saveSettingsRecord({ ...current, ...input });
      await refresh();
    },
    async uploadFont(slot, file) {
      await putFont({ slot, name: file.name, blob: file });
      const current = await loadSettings();
      await saveSettingsRecord({
        ...current,
        quoteFontCustom: slot === "quote" ? true : current.quoteFontCustom,
        authorFontCustom: slot === "author" ? true : current.authorFontCustom,
        quoteFontName: slot === "quote" ? file.name : current.quoteFontName,
        authorFontName: slot === "author" ? file.name : current.authorFontName,
        fontVersion: current.fontVersion + 1,
      });
      await refresh();
    },
    async resetFont(slot) {
      await removeFont(slot);
      const current = await loadSettings();
      await saveSettingsRecord({
        ...current,
        quoteFontCustom: slot === "quote" ? false : current.quoteFontCustom,
        authorFontCustom: slot === "author" ? false : current.authorFontCustom,
        quoteFontName: slot === "quote" ? "Source Serif 4" : current.quoteFontName,
        authorFontName: slot === "author" ? "Source Serif 4" : current.authorFontName,
        fontVersion: current.fontVersion + 1,
      });
      await refresh();
    },
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary must be used inside LibraryProvider");
  return value;
}
