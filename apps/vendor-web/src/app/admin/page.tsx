"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";

// Inline admin-only API
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
async function adminFetch<T>(path: string): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("vendor_access_token") : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

type StatCard = { label: string; value: number | string };

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    authApi.me()
      .then((me) => {
        if (me.role !== "admin" && me.role !== "super_admin") {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        Promise.all([
          adminFetch<unknown[]>("/vendors?limit=1&count=true").catch(() => null),
          adminFetch<unknown[]>("/projects?limit=1&count=true").catch(() => null),
        ]).then(([v, p]) => {
          setStats([
            { label: "전체 협력사", value: Array.isArray(v) ? v.length : "—" },
            { label: "전체 프로젝트", value: Array.isArray(p) ? p.length : "—" },
          ]);
        }).catch(() => {});
      })
      .catch(() => {
        setAuthorized(false);
        router.push("/login");
      });
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-black border-t-[#5B8DEF] animate-spin" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-[#FF6B6B] border-2 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center mx-auto">
            <span className="text-2xl font-black text-white">🔒</span>
          </div>
          <p className="text-sm font-black text-black uppercase tracking-wide">접근 권한이 없습니다</p>
          <p className="text-xs font-bold text-gray-500">관리자 계정으로 로그인해주세요</p>
          <Link
            href="/login"
            className="inline-block mt-2 px-4 py-2 bg-black text-white text-sm font-black border-2 border-black
              shadow-[3px_3px_0px_rgba(0,0,0,0.3)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* 모바일 헤더 */}
      <header className="bg-[#1A1D27] border-b-2 border-black sticky top-0 z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#5B8DEF] border-2 border-white flex items-center justify-center">
              <span className="text-xs font-black text-white">JH</span>
            </div>
            <span className="font-black text-white text-sm uppercase tracking-wide">관리자 PWA</span>
          </div>
          <Link href="/dashboard" className="text-xs font-bold text-gray-400 border border-white/20 px-2 py-0.5 hover:text-white transition-colors">
            협력사 모드
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {error && <p className="text-xs font-black text-[#FF6B6B] border-2 border-[#FF6B6B] px-3 py-2">{error}</p>}

        {/* 통계 카드 */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`border-2 border-black p-4 shadow-[4px_4px_0px_#000] ${
                  i === 0 ? "bg-[#5B8DEF] text-white" : "bg-[#FFE566] text-black"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide opacity-80">{s.label}</p>
                <p className="text-2xl font-black mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 빠른 링크 */}
        <div className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
          <div className="px-4 py-3 border-b-2 border-black">
            <p className="text-xs font-black text-black uppercase tracking-widest">빠른 메뉴</p>
          </div>
          <div className="divide-y-2 divide-black/10">
            {[
              { href: "/dashboard", label: "대시보드", icon: "⊞" },
              { href: "/bid-requests", label: "발주 수신함", icon: "◫" },
              { href: "/messages", label: "Q&A 메시지", icon: "◻" },
              { href: "/profile", label: "내 정보 수정", icon: "◈" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F5F0E8] transition-colors"
              >
                <span className="text-base font-black text-[#5B8DEF]">{item.icon}</span>
                <span className="text-sm font-bold text-black">{item.label}</span>
                <span className="ml-auto text-gray-400 text-xs font-black">›</span>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">관리자 PWA — 모바일 최적화 뷰</p>
      </main>
    </div>
  );
}
