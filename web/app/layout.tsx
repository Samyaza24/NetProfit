import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NetProfit", template: "%s - NetProfit" },
  description: "NetProfit local dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav style={{ display: "flex", gap: 16, padding: 16, borderBottom: "1px solid var(--border)" }}>
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
