import type { Metadata } from "next";
import { Inter, Outfit, Fira_Code } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fhenix Audit Docs | Security & Pedagogy UX findings",
  description: "Enterprise-grade presentation of comprehensive Fhenix platform audits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${firaCode.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-bg-deep text-text-primary">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
