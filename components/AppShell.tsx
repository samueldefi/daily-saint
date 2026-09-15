"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Studio" },
  { href: "/quotes", label: "Quotes" },
  { href: "/photos", label: "Photos" },
  { href: "/settings", label: "Fonts" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 px-4 pt-4">
        <nav className="nav-pill mx-auto max-w-[1280px]">
          <Link
            href="/"
            className="px-4 py-2 text-[15px] font-medium tracking-[0.08em] uppercase"
          >
            Daily Saint
          </Link>
          <div className="flex flex-1 items-center justify-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-[16px] ${
                    active
                      ? "bg-[#0d0d0d] text-[#ffffff]"
                      : "text-[#6e6a69] hover:text-[#0d0d0d]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1280px] px-6 pb-20 pt-10">{children}</main>
    </div>
  );
}
