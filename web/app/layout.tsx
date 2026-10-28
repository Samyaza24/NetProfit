import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NetProfit",
  description: "NetProfit local dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <nav style={{ display: "flex", gap: 16, padding: 16, borderBottom: "1px solid #ccc" }}>
          <Link href="/">Dashboard</Link>
          <Link href="/transactions">Transactions</Link>
          <Link href="/expenses">Expenses</Link>
          <Link href="/devices">Devices</Link>
          <Link href="/pair">Pair Device</Link>
        </nav>
        <main style={{ padding: 16 }}>{children}</main>
      </body>
    </html>
  );
}
