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
        // 기본 통계 조회
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-2xl">🔒</p>
          <p className="text-sm font-medium text-gray-800">접근 권한이 없습니다</p>
          <p className="text-xs text-gray-400">관리자 계정으로 로그인해주세요</p>
          <Link href="/login" className="inline-block mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">로그인</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 최적화 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-top">
        <div className="px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-blue-600 text-sm">관리자 PWA</span>
          <Link href="/dashboard" className="text-xs text-gray-400">협력사 모드</Link>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* 통계 카드 */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 빠른 링크 */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <p className="px-4 py-3 text-xs font-medium text-gray-500">빠른 메뉴</p>
          {[
            { href: "/dashboard", label: "대시보드", icon: "🏠" },
            { href: "/bid-requests", label: "발주 수신함", icon: "📋" },
            { href: "/messages", label: "Q&A 메시지", icon: "💬" },
            { href: "/profile", label: "내 정보 수정", icon: "👤" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-gray-700">{item.label}</span>
              <span className="ml-auto text-gray-300 text-xs">›</span>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400">관리자 PWA — 모바일 최적화 뷰</p>
      </main>
    </div>
  );
}
