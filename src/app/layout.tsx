import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RO LATAM Build Consultant",
  description: "Consultor inteligente de builds para Ragnarok Online LATAM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-ro-dark text-white min-h-screen">{children}</body>
    </html>
  );
}
