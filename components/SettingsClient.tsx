"use client";

import { useTransition } from "react";
import { useLibrary } from "@/lib/library-context";

export function SettingsClient() {
  const { settings, uploadFont, resetFont } = useLibrary();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <header>
        <p className="eyebrow">Brand</p>
        <h1 className="display mt-3">Fonts</h1>
        <p className="mt-3 text-[#6e6a69]">
          Source Serif 4 is locked in for the card. Upload a TTF, OTF, or WOFF file to replace
          one face.
        </p>
      </header>

      <section className="paper-card space-y-3 p-6">
        <h2 className="text-[18px]">Quote</h2>
        <p className="text-[#6e6a69]">{settings.quoteFontName}</p>
        <input
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) startTransition(() => uploadFont("quote", file));
          }}
        />
        {settings.quoteFontCustom ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => startTransition(() => resetFont("quote"))}
          >
            Restore default
          </button>
        ) : null}
      </section>

      <section className="paper-card space-y-3 p-6">
        <h2 className="text-[18px]">Author</h2>
        <p className="text-[#6e6a69]">{settings.authorFontName}</p>
        <input
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) startTransition(() => uploadFont("author", file));
          }}
        />
        {settings.authorFontCustom ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => startTransition(() => resetFont("author"))}
          >
            Restore default
          </button>
        ) : null}
      </section>
    </div>
  );
}
