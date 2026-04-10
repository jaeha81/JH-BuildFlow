"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",            label: "홈",    icon: "◈" },
  { href: "/bids",        label: "발주",  icon: "◎" },
  { href: "/settlements", label: "정산",  icon: "◆" },
  { href: "/messages",    label: "메시지", icon: "◉" },
  { href: "/vendors",     label: "협력사", icon: "◇" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1D27] border-t-2 border-white/10">
      <ul className="flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-bold transition-colors ${
                  active ? "text-[#5B8DEF]" : "text-white/40 hover:text-white/70"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-[#5B8DEF]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
