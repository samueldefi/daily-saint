"use client";

import { LibraryProvider } from "@/lib/library-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <LibraryProvider>{children}</LibraryProvider>;
}
