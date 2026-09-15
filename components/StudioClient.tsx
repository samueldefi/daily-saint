"use client";

import { useRef, useState, useTransition } from "react";
import { toJpeg } from "html-to-image";
import { QuoteCard } from "@/components/QuoteCard";
import { useLibrary } from "@/lib/library-context";
import { CARD_HEIGHT, CARD_WIDTH, type Settings } from "@/lib/types";

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export function StudioClient() {
  const {
    quotes,
    photos,
    settings,
    quoteFontUrl,
    authorFontUrl,
    markPairUsed,
    saveLook,
  } = useLibrary();
  const [overlayColor, setOverlayColor] = useState(settings.overlayColor);
  const [overlayOpacity, setOverlayOpacity] = useState(settings.overlayOpacity);
  const [greyscale, setGreyscale] = useState(settings.greyscale);
  const [grainIntensity, setGrainIntensity] = useState(settings.grainIntensity);
  const [unusedOnly, setUnusedOnly] = useState(true);
  const [quoteId, setQuoteId] = useState<string | null>(
    () => quotes.find((quote) => !quote.used)?.id ?? quotes[0]?.id ?? null,
  );
  const [photoId, setPhotoId] = useState<string | null>(
    () => photos.find((photo) => !photo.used)?.id ?? photos[0]?.id ?? null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const exportRef = useRef<HTMLDivElement>(null);

  const liveSettings: Settings = {
    ...settings,
    overlayColor,
    overlayOpacity,
    greyscale,
    grainIntensity,
  };

  const quotePool = unusedOnly ? quotes.filter((quote) => !quote.used) : quotes;
  const photoPool = unusedOnly ? photos.filter((photo) => !photo.used) : photos;
  const quote = quotes.find((item) => item.id === quoteId) ?? null;
  const photo = photos.find((item) => item.id === photoId) ?? null;
  const previewScale = 0.42;
  const photoUrl = photo?.url ?? null;

  function newPair() {
    setQuoteId(pickRandom(quotePool.length ? quotePool : quotes)?.id ?? null);
    setPhotoId(pickRandom(photoPool.length ? photoPool : photos)?.id ?? null);
    setStatus("New random pair");
  }

  function shufflePhoto() {
    const pool = (photoPool.length ? photoPool : photos).filter(
      (item) => item.id !== photoId,
    );
    setPhotoId(pickRandom(pool.length ? pool : photos)?.id ?? null);
    setStatus("Background shuffled");
  }

  async function downloadCard() {
    if (!quote || !exportRef.current) {
      setStatus("Add a quote first.");
      return;
    }
    setStatus("Rendering…");
    await document.fonts.ready;
    const dataUrl = await toJpeg(exportRef.current, {
      quality: 0.92,
      pixelRatio: 1,
      canvasWidth: CARD_WIDTH,
      canvasHeight: CARD_HEIGHT,
    });
    const link = document.createElement("a");
    const slug = quote.author.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
    link.download = `${slug || "saint"}.jpg`;
    link.href = dataUrl;
    link.click();
    startTransition(async () => {
      await markPairUsed(quote.id, photo?.id ?? "");
      await saveLook({ overlayColor, overlayOpacity, greyscale, grainIntensity });
    });
    setStatus("Saved and marked used.");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex flex-col items-center gap-6">
        {quote?.used ? (
          <p className="paper-card max-w-xl text-center text-[#6e6a69]">
            This quote is already marked used. You can still export; it will stay used.
          </p>
        ) : null}
        <div
          className="overflow-hidden"
          style={{
            width: CARD_WIDTH * previewScale,
            height: CARD_HEIGHT * previewScale,
            borderRadius: 12,
          }}
        >
          <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
            <QuoteCard
              quote={quote}
              photoUrl={photoUrl}
              settings={liveSettings}
              quoteFontUrl={quoteFontUrl}
              authorFontUrl={authorFontUrl}
            />
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none"
          style={{ position: "fixed", left: -4000, top: 0 }}
        >
          <div ref={exportRef}>
            <QuoteCard
              quote={quote}
              photoUrl={photoUrl}
              settings={liveSettings}
              quoteFontUrl={quoteFontUrl}
              authorFontUrl={authorFontUrl}
            />
          </div>
        </div>
        {!quotes.length || !photos.length ? (
          <p className="max-w-md text-center text-[#6e6a69]">
            Add quotes and photos to the library, then come back here to pair them.
          </p>
        ) : null}
        {status ? <p className="text-[14px] text-[#9a9796]">{status}</p> : null}
      </section>

      <aside className="paper-card flex flex-col gap-6 p-6">
        <div>
          <p className="eyebrow">Pairing</p>
          <h1 className="display mt-2">{quote ? quote.author : "No quote yet"}</h1>
          {quote?.scripture ? <p className="mt-2 text-[#6e6a69]">{quote.scripture}</p> : null}
          {quote?.feastDay ? <p className="mt-1 text-[#6e6a69]">Feast {quote.feastDay}</p> : null}
        </div>

        <label className="flex items-center gap-3 text-[#6e6a69]">
          <input
            type="checkbox"
            checked={unusedOnly}
            onChange={(event) => setUnusedOnly(event.target.checked)}
          />
          Prefer unused
        </label>

        <div className="flex flex-col gap-3">
          <button type="button" className="btn-primary" onClick={newPair}>
            New random pair
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={shufflePhoto}
            disabled={!photos.length}
          >
            Shuffle background
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPickerOpen(true)}
            disabled={!photos.length}
          >
            Choose background
          </button>
          <label className="text-[#6e6a69]">
            Quote
            <select
              className="field mt-2"
              value={quoteId ?? ""}
              onChange={(event) => setQuoteId(event.target.value || null)}
            >
              {quotes.length === 0 ? <option value="">No quotes</option> : null}
              {quotes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.used ? "Used · " : ""}
                  {item.author} — {item.text.slice(0, 48)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-4">
          <p className="eyebrow">Look</p>
          <label className="flex items-center justify-between text-[#6e6a69]">
            Greyscale
            <input
              type="checkbox"
              checked={greyscale}
              onChange={(event) => setGreyscale(event.target.checked)}
            />
          </label>
          <label className="block text-[#6e6a69]">
            Overlay colour
            <input
              type="color"
              className="mt-2 h-10 w-full cursor-pointer bg-transparent"
              value={overlayColor}
              onChange={(event) => setOverlayColor(event.target.value)}
            />
          </label>
          <label className="block text-[#6e6a69]">
            Overlay opacity {Math.round(overlayOpacity * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              className="mt-2 w-full"
              value={overlayOpacity}
              onChange={(event) => setOverlayOpacity(Number(event.target.value))}
            />
          </label>
          <label className="block text-[#6e6a69]">
            Grain {Math.round(grainIntensity * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              className="mt-2 w-full"
              value={grainIntensity}
              onChange={(event) => setGrainIntensity(Number(event.target.value))}
            />
          </label>
        </div>

        <button type="button" className="btn-primary" onClick={downloadCard} disabled={pending}>
          Download card
        </button>
      </aside>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0d0d]/40 p-8">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-[16px] bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="display">Choose background</h2>
              <button type="button" className="btn-ghost" onClick={() => setPickerOpen(false)}>
                Close
              </button>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {photos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="relative aspect-[4/5] overflow-hidden"
                  style={{ borderRadius: 12 }}
                  onClick={() => {
                    setPhotoId(item.id);
                    setPickerOpen(false);
                    setStatus("Background selected");
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.originalName}
                    className="h-full w-full object-cover"
                  />
                  {item.used ? (
                    <span className="used-stamp absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1">
                      Used
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
