import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Escalate — Quantum Wealth & Market Intelligence",
  description: "Plataforma quantitativa de acompanhamento patrimonial, comparador de investimentos, simulador de juros e motor preditivo DTQW + GoRules ZEN",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[var(--ds-bg-primary)] text-[var(--ds-text-primary)]`}
    >
      <body className="min-h-full flex flex-col bg-[var(--ds-bg-primary)] text-[var(--ds-text-primary)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
