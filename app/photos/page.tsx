"use client";

import { PhotosClient } from "@/components/PhotosClient";
import { useLibrary } from "@/lib/library-context";

export default function PhotosPage() {
  const library = useLibrary();
  if (!library.ready) return <p className="text-[#6e6a69]">Loading library…</p>;
  return <PhotosClient />;
}
