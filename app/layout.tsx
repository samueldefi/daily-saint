import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import "./globals.css";

const oracle = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-cosmosoracle",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Daily Saint",
  description: "Build a saint quote library and export Instagram cards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oracle.variable} h-full`}>
      <body className={`${oracle.className} min-h-full`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
