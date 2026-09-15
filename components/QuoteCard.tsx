"use client";

import { CARD_HEIGHT, CARD_WIDTH, type Quote, type Settings } from "@/lib/types";

type CardProps = {
  quote: Quote | null;
  photoUrl: string | null;
  settings: Settings;
  quoteFontUrl: string;
  authorFontUrl: string;
};

export function QuoteCard({
  quote,
  photoUrl,
  settings,
  quoteFontUrl,
  authorFontUrl,
}: CardProps) {
  const overlay = hexToRgba(settings.overlayColor, settings.overlayOpacity);

  return (
    <div
      className="saint-card relative overflow-hidden text-center"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: "#111",
      }}
    >
      <style>{`
        @font-face {
          font-family: "SaintQuote";
          src: url("${quoteFontUrl}");
          font-weight: 600;
          font-display: block;
        }
        @font-face {
          font-family: "SaintAuthor";
          src: url("${authorFontUrl}");
          font-weight: 400;
          font-display: block;
        }
      `}</style>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: settings.greyscale ? "grayscale(1)" : "none" }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: settings.overlayColor }} />
      )}
      <div className="absolute inset-0" style={{ background: overlay }} />
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.2)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/textures/grain.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{
          mixBlendMode: "soft-light",
          opacity: settings.grainIntensity,
        }}
      />
      <div
        className="relative z-10 flex h-full flex-col items-center"
        style={{ padding: "73px 0" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cross.svg" alt="" width={54} height={71} />
        <div
          className="flex flex-1 items-center justify-center"
          style={{ padding: "0 261px" }}
        >
          <p
            style={{
              fontFamily: "SaintQuote, serif",
              fontSize: quoteFontSize(quote?.text),
              lineHeight: 1.2,
              color: "#FFF4EF",
              fontWeight: 600,
              margin: 0,
            }}
          >
            {quote?.text ?? "Add a quote to begin"}
          </p>
        </div>
        <p
          style={{
            fontFamily: "SaintAuthor, serif",
            fontSize: 43,
            color: "#FFF4EF",
            margin: 0,
          }}
        >
          {quote?.author ?? ""}
        </p>
      </div>
    </div>
  );
}

function quoteFontSize(text: string | undefined) {
  const length = text?.length ?? 0;
  if (length > 220) return 44;
  if (length > 150) return 52;
  if (length > 90) return 58;
  return 65;
}

function hexToRgba(hex: string, opacity: number) {
  const value = hex.replace("#", "");
  const safe =
    value.length === 3
      ? value
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : value.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(safe, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
