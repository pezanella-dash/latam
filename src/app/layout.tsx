import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Database, Newspaper, Zap } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "RO LATAM Database",
  description:
    "Base de dados completa do Ragnarok Online LATAM — itens, monstros e skills",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Force Dark Mode for Ragnarok Theme */}
      </head>
      <body className={`${inter.className} bg-ro-dark min-h-screen text-[var(--ro-text)] transition-colors duration-300 relative font-sans selection:bg-ro-gold selection:text-black`}>

        {/* Clean Ultra-Modern Mesh Gradient Background */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-ro-gold/5 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-ro-gold/5 blur-[100px] mix-blend-screen" />
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }} />
        </div>

        {/* Floating Pill Navigation */}
        <div className="sticky top-4 z-40 px-4 flex justify-center w-full">
          <nav
            className="flex items-center justify-between px-6 py-3 w-full max-w-5xl rounded-full border border-[var(--ro-border-light)] shadow-2xl"
            style={{
              background: "var(--ro-nav-bg)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)"
            }}
          >
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
              <div className="flex items-center gap-2 group-hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/poring.png?v=2`} alt="Poring" className="w-[36px] h-[36px] object-contain drop-shadow-md" />
                </div>
                <span className="font-black text-2xl tracking-tight text-ro-text">
                  RO <span className="text-ro-muted font-medium">LATAM</span>
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/database"
                className="flex items-center gap-2 text-sm font-medium text-ro-muted hover:text-ro-text transition-colors"
              >
                <Database size={16} />
                <span>Database</span>
              </Link>
              <Link
                href="/novidades"
                className="flex items-center gap-2 text-sm font-medium text-ro-muted hover:text-ro-text transition-colors"
              >
                <Newspaper size={16} />
                <span>Novidades</span>
              </Link>
              <Link
                href="/builds"
                className="flex items-center gap-2 text-sm font-medium text-ro-muted hover:text-ro-text transition-colors"
              >
                <Zap size={16} />
                <span>Builds</span>
              </Link>

              <div className="pl-6 ml-2 border-l border-ro-border">
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </div>

        <div className="pt-8">
          {children}
        </div>
      </body>
    </html>
  );
}
