"use client";

import { StudioClient } from "@/components/StudioClient";
import { useLibrary } from "@/lib/library-context";

export default function StudioPage() {
  const library = useLibrary();
  if (!library.ready) return <p className="text-[#6e6a69]">Loading library…</p>;
  return <StudioClient />;
}
