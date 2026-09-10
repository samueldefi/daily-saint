"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_ATTR_FONT,
  DEFAULT_QUOTE_FONT,
} from "@/lib/config";
import { generateSaintImage, prepareGrain, sanitizeFilename } from "@/lib/generate";
import { loadDefaultFonts, loadUploadedFont } from "@/lib/fonts";
import { parseQuotesJson } from "@/lib/quotes";
import { SAMPLE_QUOTES } from "@/lib/samples";
import type { PreviewItem, Quote } from "@/lib/types";
import { zipImages } from "@/lib/zip";

type NamedFile = { name: string; file: File };

function FileDrop({
  label,
  hint,
  accept,
  multiple,
  files,
  onFiles,
}: {
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  files: { name: string }[];
  onFiles: (files: File[]) => void;
}) {
  const [over, setOver] = useState(false);
  const id = label.replace(/\s+/g, "-").toLowerCase();

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const next = [...event.dataTransfer.files];
        if (next.length) onFiles(next);
      }}
      className={`block cursor-pointer rounded-lg border px-3 py-3 transition ${
        over
          ? "border-gold bg-gold/10"
          : files.length
            ? "border-line bg-cream/[0.04]"
            : "border-dashed border-line hover:border-cream-mute"
      }`}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          const next = event.target.files ? [...event.target.files] : [];
          if (next.length) onFiles(next);
          event.target.value = "";
        }}
      />
      <p className="text-[11px] tracking-[0.16em] uppercase text-cream-mute">
        {label}
      </p>
      <p className="mt-1 text-sm text-cream-dim">
        {files.length
          ? files.map((file) => file.name).join(", ")
          : hint}
      </p>
    </label>
  );
}

export function Studio() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLabel, setQuotesLabel] = useState("");
  const [backgrounds, setBackgrounds] = useState<NamedFile[]>([]);
  const [boldFont, setBoldFont] = useState<NamedFile | null>(null);
  const [lightFont, setLightFont] = useState<NamedFile | null>(null);
  const [grainFile, setGrainFile] = useState<NamedFile | null>(null);
  const [grayscale, setGrayscale] = useState(true);
  const [useSolid, setUseSolid] = useState(false);
  const [solidColor, setSolidColor] = useState("#1a1a1a");
  const [grainIntensity, setGrainIntensity] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    loadDefaultFonts()
      .then(() => setFontsReady(true))
      .catch(() => setError("Could not load default fonts."));
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      if (zipUrl) URL.revokeObjectURL(zipUrl);
    };
  }, [zipUrl]);

  const quoteFont = boldFont ? "DailySaintQuoteUpload" : DEFAULT_QUOTE_FONT;
  const attrFont = lightFont ? "DailySaintAttrUpload" : DEFAULT_ATTR_FONT;

  const missing = useMemo(() => {
    const items: string[] = [];
    if (!quotes.length) items.push("quotes JSON");
    if (!useSolid && !backgrounds.length) items.push("background images");
    if (!fontsReady) items.push("fonts");
    return items;
  }, [quotes.length, useSolid, backgrounds.length, fontsReady]);

  const ready = missing.length === 0 && !busy;

  const clearResults = useCallback(() => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current = [];
    setPreviews([]);
    setZipUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setCount(0);
  }, []);

  const onQuotesFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const next = parseQuotesJson(raw);
      setQuotes(next);
      setQuotesLabel(file.name);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON file");
    }
  };

  const loadSamples = () => {
    setQuotes(SAMPLE_QUOTES);
    setQuotesLabel("sample quotes");
    setUseSolid(true);
    setError("");
  };

  const generate = async () => {
    if (!ready) return;
    setBusy(true);
    setError("");
    clearResults();

    try {
      const bitmaps = useSolid
        ? []
        : await Promise.all(backgrounds.map((item) => createImageBitmap(item.file)));
      const grain = grainFile ? await prepareGrain(grainFile.file) : null;
      const outputs: { filename: string; blob: Blob }[] = [];
      const nextPreviews: PreviewItem[] = [];

      for (let i = 0; i < quotes.length; i++) {
        const quote = quotes[i];
        const background =
          useSolid || !bitmaps.length
            ? null
            : bitmaps[Math.floor(Math.random() * bitmaps.length)];
        const blob = await generateSaintImage({
          quote: quote.text,
          saintName: quote.saint || "Unknown Saint",
          background,
          solidColor: useSolid ? solidColor : null,
          grayscale,
          quoteFont,
          attrFont,
          grain,
          grainIntensity,
        });
        const filename = `${sanitizeFilename(quote.saint || "Unknown_Saint")}_${String(i + 1).padStart(3, "0")}.jpg`;
        outputs.push({ filename, blob });
        if (nextPreviews.length < 6) {
          const url = URL.createObjectURL(blob);
          previewUrls.current.push(url);
          nextPreviews.push({ filename, url });
        }
        setProgress(`Generated ${i + 1}/${quotes.length}`);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      bitmaps.forEach((bitmap) => bitmap.close());
      const zip = await zipImages(outputs);
      setZipUrl(URL.createObjectURL(zip));
      setPreviews(nextPreviews);
      setCount(outputs.length);
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-bg text-cream">
      <header className="border-b border-line px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-gold">
              Studio
            </p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight md:text-4xl">
              The Daily Saint
            </h1>
          </div>
          <p className="hidden max-w-xs text-right text-sm text-cream-dim md:block">
            Batch generate Instagram images at 1080×1350.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-[minmax(0,22rem)_1fr] md:px-10">
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] tracking-[0.18em] uppercase text-cream-mute">
                Files
              </h2>
              <button
                type="button"
                onClick={loadSamples}
                className="text-xs text-gold underline-offset-4 hover:underline"
              >
                Load sample quotes
              </button>
            </div>
            <FileDrop
              label="Quotes JSON"
              hint="Drop a JSON file with a quotes array"
              accept="application/json,.json"
              files={quotesLabel ? [{ name: `${quotesLabel} (${quotes.length})` }] : []}
              onFiles={onQuotesFile}
            />
            <FileDrop
              label="Background images"
              hint="JPG or PNG. One is picked at random for each quote."
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              multiple
              files={backgrounds}
              onFiles={(files) =>
                setBackgrounds(
                  files
                    .filter((file) => file.type.startsWith("image/"))
                    .map((file) => ({ name: file.name, file })),
                )
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <FileDrop
                label="Bold font"
                hint="Optional. Default serif is included."
                accept=".ttf,.otf,font/ttf,font/otf"
                files={boldFont ? [boldFont] : []}
                onFiles={async (files) => {
                  const file = files[0];
                  if (!file) return;
                  await loadUploadedFont("quote", file);
                  setBoldFont({ name: file.name, file });
                }}
              />
              <FileDrop
                label="Light font"
                hint="Optional. Used for the saint name."
                accept=".ttf,.otf,font/ttf,font/otf"
                files={lightFont ? [lightFont] : []}
                onFiles={async (files) => {
                  const file = files[0];
                  if (!file) return;
                  await loadUploadedFont("attr", file);
                  setLightFont({ name: file.name, file });
                }}
              />
            </div>
            <FileDrop
              label="Film grain"
              hint="Optional texture overlay"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              files={grainFile ? [grainFile] : []}
              onFiles={(files) => {
                const file = files[0];
                if (file) setGrainFile({ name: file.name, file });
              }}
            />
          </div>

          <div className="space-y-3 border-t border-line pt-6">
            <h2 className="text-[11px] tracking-[0.18em] uppercase text-cream-mute">
              Options
            </h2>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={grayscale}
                onChange={(event) => setGrayscale(event.target.checked)}
                className="size-4 accent-gold"
              />
              Black and white backgrounds
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={useSolid}
                onChange={(event) => setUseSolid(event.target.checked)}
                className="size-4 accent-gold"
              />
              Use solid color instead
            </label>
            {useSolid ? (
              <label className="flex items-center gap-3 text-sm text-cream-dim">
                Background color
                <input
                  type="color"
                  value={solidColor}
                  onChange={(event) => setSolidColor(event.target.value)}
                  className="h-8 w-12"
                />
                <span className="font-mono text-xs">{solidColor}</span>
              </label>
            ) : null}
            {grainFile ? (
              <label className="block text-sm text-cream-dim">
                Grain intensity {grainIntensity.toFixed(1)}
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={grainIntensity}
                  onChange={(event) =>
                    setGrainIntensity(Number(event.target.value))
                  }
                  className="mt-2 w-full"
                />
              </label>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-line bg-panel p-5">
            {quotes.length && (useSolid || backgrounds.length) ? (
              <p className="text-sm text-cream">
                Ready: {quotes.length} quotes
                {useSolid
                  ? " · Solid color"
                  : ` · ${backgrounds.length} backgrounds`}
              </p>
            ) : (
              <p className="text-sm text-cream-dim">
                Missing: {missing.join(", ") || "nothing"}
              </p>
            )}
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
            {progress ? (
              <p className="mt-2 text-sm text-gold">{progress}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!ready}
                onClick={generate}
                className="rounded-full bg-cream px-5 py-2.5 text-sm font-medium text-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Generating…" : "Generate all images"}
              </button>
              {zipUrl ? (
                <a
                  href={zipUrl}
                  download={`daily_saint_${new Date()
                    .toISOString()
                    .replace(/[-:]/g, "")
                    .slice(0, 15)}.zip`}
                  className="rounded-full border border-line px-5 py-2.5 text-sm text-cream hover:border-cream-mute"
                >
                  Download ZIP · {count} images
                </a>
              ) : null}
            </div>
          </div>

          {previews.length ? (
            <div>
              <h2 className="mb-3 text-[11px] tracking-[0.18em] uppercase text-cream-mute">
                Preview
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {previews.map((item) => (
                  <figure key={item.filename} className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="aspect-[4/5] w-full rounded-lg object-cover"
                    />
                    <figcaption className="truncate text-xs text-cream-mute">
                      {item.filename}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex aspect-[4/5] max-w-sm items-center justify-center rounded-xl border border-dashed border-line text-center text-sm text-cream-mute">
              Generated images will show here.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
