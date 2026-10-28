"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { IconName } from "./Icon";

const LINKS: [string, string, IconName][] = [
  ["/", "Dashboard", "grid"],
  ["/transactions", "Transactions", "receipt"],
  ["/expenses", "Expenses", "wallet"],
  ["/devices", "Devices", "phone"],
  ["/pair", "Pair a phone", "qr"],
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="NetProfit home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mark.png" alt="" />
        <span className="name">
          Net<span className="profit">Profit</span>
        </span>
      </Link>
      <nav className="nav" aria-label="Main">
        {LINKS.map(([href, label, icon]) => (
          <Link key={href} href={href} aria-current={path === href || (href === "/" && path.startsWith("/customers")) ? "page" : undefined}>
            <Icon name={icon} />
            {label}
          </Link>
        ))}
      </nav>
      <p className="sidebar-foot">Local mode - this PC only</p>
    </aside>
  );
}
