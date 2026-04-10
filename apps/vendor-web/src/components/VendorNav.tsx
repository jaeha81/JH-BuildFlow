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
    <header className="bg-white border-b-2 border-black sticky top-0 z-10 shadow-[0_4px_0px_#000]">
      <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
        {/* 로고 */}
        <Link href="/dashboard" className="font-black text-black text-sm tracking-tight uppercase">
          JH <span className="bg-[#5B8DEF] text-white px-1.5 py-0.5 border-2 border-black">BuildFlow</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-0.5">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`
                  px-3 py-1.5 text-sm font-bold border-2 transition-all
                  ${active
                    ? "bg-[#5B8DEF] text-white border-black shadow-[2px_2px_0px_#000]"
                    : "bg-white text-black border-transparent hover:border-black hover:shadow-[2px_2px_0px_#000]"
                  }
                `}
              >
                {n.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="ml-2 px-3 py-1.5 text-sm font-bold border-2 border-black bg-white text-black
              shadow-[2px_2px_0px_#000]
              hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  );
}
