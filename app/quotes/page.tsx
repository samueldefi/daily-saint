"use client";

import { QuotesClient } from "@/components/QuotesClient";
import { useLibrary } from "@/lib/library-context";

export default function QuotesPage() {
  const library = useLibrary();
  if (!library.ready) return <p className="text-[#6e6a69]">Loading library…</p>;
  return <QuotesClient />;
}
