"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearVendorTokens } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "홈" },
  { href: "/bid-requests", label: "발주 수신함" },
  { href: "/messages", label: "Q&A" },
  { href: "/profile", label: "내 정보" },
];

export function VendorNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearVendorTokens();
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard" className="font-bold text-blue-600 text-sm">
          JH BuildFlow
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith(n.href)
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {n.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="ml-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-600"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  );
}
