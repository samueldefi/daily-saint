"use client";

import { useRef, useState, useTransition } from "react";
import { useLibrary } from "@/lib/library-context";
import type { Quote } from "@/lib/types";

export function QuotesClient() {
  const {
    quotes,
    durableQuotes,
    addQuote,
    importQuotes,
    deleteQuote,
    setQuoteUsed,
    exportQuotes,
  } = useLibrary();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unused" | "used">("all");
  const [message, setMessage] = useState("");
  const [duplicates, setDuplicates] = useState<Quote[]>([]);
  const [pending, startTransition] = useTransition();
  const importRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const visible = quotes.filter((quote) => {
    if (filter === "used" && !quote.used) return false;
    if (filter === "unused" && quote.used) return false;
    const hay =
      `${quote.text} ${quote.author} ${quote.feastDay} ${quote.scripture} ${quote.tags.join(" ")}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-4xl space-y-16">
      <header>
        <p className="eyebrow">Library</p>
        <h1 className="display mt-3">Quotes</h1>
        <p className="mt-3 text-[#6e6a69]">
          {quotes.length} saved · {quotes.filter((quote) => quote.used).length} used
        </p>
        <p className="mt-3 text-[14px] leading-[1.5] text-[#6e6a69]">
          {durableQuotes
            ? "Quotes are stored in Neon. Clearing the browser cache does not remove them."
            : "Quotes stay in this browser until you connect Neon in Vercel. Then they survive cache clears."}
        </p>
      </header>

      <form
        ref={formRef}
        className="paper-card grid gap-4 p-6 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await addQuote({
              text: String(formData.get("text") ?? ""),
              author: String(formData.get("author") ?? ""),
              feastDay: String(formData.get("feastDay") ?? ""),
              scripture: String(formData.get("scripture") ?? ""),
              tags: String(formData.get("tags") ?? ""),
            });
            if (!result.ok) {
              setMessage(result.error);
              setDuplicates(result.duplicate ? [result.duplicate] : []);
            } else {
              setMessage("Quote saved.");
              setDuplicates([]);
              formRef.current?.reset();
            }
          });
        }}
      >
        <label className="text-[#6e6a69] md:col-span-2">
          Quote
          <textarea
            name="text"
            required
            rows={3}
            className="field mt-2"
            placeholder="The words on the card"
          />
        </label>
        <label className="text-[#6e6a69]">
          Author
          <input name="author" required className="field mt-2" placeholder="St. Basil the Great" />
        </label>
        <label className="text-[#6e6a69]">
          Feast day
          <input name="feastDay" className="field mt-2" placeholder="01-02" />
        </label>
        <label className="text-[#6e6a69]">
          Scripture
          <input name="scripture" className="field mt-2" placeholder="1 Cor 1:25" />
        </label>
        <label className="text-[#6e6a69]">
          Tags
          <input name="tags" className="field mt-2" placeholder="hope, martyrdom" />
        </label>
        <button type="submit" className="btn-primary w-fit" disabled={pending}>
          Add quote
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-[24px] font-light leading-[1.2] tracking-[-0.48px]">Import</h2>
        <p className="text-[#6e6a69]">
          Paste your JSON. Keep <code>text</code>, <code>saint</code>, and <code>feastDay</code>.
          Existing matches are skipped and listed below.
        </p>
        <textarea
          ref={importRef}
          rows={8}
          className="field"
          placeholder='{"quotes":[{"text":"…","saint":"St. Basil the Great","feastDay":"01-02"}]}'
        />
        <div className="flex flex-wrap gap-3">
          <input
            type="file"
            accept=".json,.txt,.csv"
            className="text-[#6e6a69]"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file || !importRef.current) return;
              importRef.current.value = await file.text();
            }}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => {
              const raw = importRef.current?.value ?? "";
              startTransition(async () => {
                const result = await importQuotes(raw);
                if (!result.ok) {
                  setMessage(result.error);
                  setDuplicates([]);
                } else {
                  setMessage(`Imported ${result.added}. Skipped ${result.skipped} duplicates.`);
                  setDuplicates(result.duplicates);
                }
              });
            }}
          >
            Import into library
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={pending || quotes.length === 0}
            onClick={() => {
              startTransition(async () => {
                const json = await exportQuotes();
                const blob = new Blob([json], { type: "application/json" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "daily-saint-quotes.json";
                link.click();
              });
            }}
          >
            Export JSON
          </button>
        </div>
      </section>

      {duplicates.length ? (
        <section className="paper-card space-y-4 p-6">
          <h2 className="text-[18px]">Duplicates skipped</h2>
          <p className="text-[14px] text-[#6e6a69]">These quotes were already in the database.</p>
          <ul className="space-y-4">
            {duplicates.map((quote) => (
              <li key={quote.id} className="text-[16px]">
                <p>{quote.text}</p>
                <p className="mt-1 text-[14px] text-[#6e6a69]">
                  {quote.author}
                  {quote.feastDay ? ` · ${quote.feastDay}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field max-w-xs"
            placeholder="Search text, saint, feast day"
          />
          <select
            className="field w-40"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
          >
            <option value="all">All</option>
            <option value="unused">Unused</option>
            <option value="used">Used</option>
          </select>
        </div>
        {message ? <p className="text-[#6e6a69]">{message}</p> : null}
        <ul className="space-y-6">
          {visible.map((quote) => (
            <li key={quote.id} className="paper-card p-6">
              <p className="text-[18px] leading-[1.29] tracking-[-0.2px]">{quote.text}</p>
              <p className="mt-2 text-[#6e6a69]">
                {quote.author}
                {quote.feastDay ? ` · ${quote.feastDay}` : ""}
                {quote.scripture ? ` · ${quote.scripture}` : ""}
              </p>
              {quote.tags.length ? (
                <p className="mt-1 text-[14px] text-[#9a9796]">{quote.tags.join(" · ")}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="used-stamp">{quote.used ? "Used" : "Unused"}</span>
                <button
                  type="button"
                  className="btn-ghost !px-4 !py-2 text-[14px]"
                  onClick={() => startTransition(() => setQuoteUsed(quote.id, !quote.used))}
                >
                  Mark {quote.used ? "unused" : "used"}
                </button>
                <button
                  type="button"
                  className="btn-ghost !px-4 !py-2 text-[14px]"
                  onClick={() => startTransition(() => deleteQuote(quote.id))}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {visible.length === 0 ? <li className="text-[#9a9796]">No quotes in this view.</li> : null}
        </ul>
      </section>
    </div>
  );
}
