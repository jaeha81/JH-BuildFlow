"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import MobileNav from "@/components/MobileNav";
import StatCard from "@/components/StatCard";
import { analyticsApi, settlementApi, messageApi, vendorApi } from "@/lib/api";
import { logout } from "@/lib/auth";
import type { UserMe } from "@/lib/api";

interface Stats {
  activeBids: number;
  pendingSettlements: number;
  escalated: number;
  totalVendors: number;
}

function Dashboard({ user }: { user: UserMe }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      analyticsApi.bidStats(),
      settlementApi.list({ status: "pending" }),
      messageApi.escalationStats(),
      vendorApi.list(),
    ]).then(([bids, settlements, escalation, vendors]) => {
      setStats({
        activeBids:
          bids.status === "fulfilled" ? bids.value.pending_count : 0,
        pendingSettlements:
          settlements.status === "fulfilled" ? settlements.value.length : 0,
        escalated:
          escalation.status === "fulfilled" ? escalation.value.unresolved : 0,
        totalVendors:
          vendors.status === "fulfilled" ? vendors.value.length : 0,
      });
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* 헤더 */}
      <header className="bg-[#1A1D27] border-b-2 border-white/10 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-white">JH BuildFlow</h1>
          <p className="text-xs text-white/40">{user.name} · {user.role}</p>
        </div>
        <button
          onClick={logout}
          className="text-xs font-bold text-white/40 border border-white/20 px-3 py-1.5 hover:text-white/70 transition-colors"
        >
          로그아웃
        </button>
      </header>

      <main className="page-content px-4 pt-4">
        <h2 className="text-sm font-black text-white/60 uppercase tracking-widest mb-4">
          오늘 현황
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[#1A1D27] border-2 border-white/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="발주 대기" value={stats?.activeBids ?? 0} accent="#5B8DEF" sub="응답 미완료" />
            <StatCard label="정산 승인 대기" value={stats?.pendingSettlements ?? 0} accent="#FFE566" sub="검토 필요" />
            <StatCard label="에스컬레이션" value={stats?.escalated ?? 0} accent="#FF6B6B" sub="미처리 문의" />
            <StatCard label="전체 협력사" value={stats?.totalVendors ?? 0} accent="#4ADE80" sub="등록 업체" />
          </div>
        )}

        {/* 빠른 링크 */}
        <h2 className="text-sm font-black text-white/60 uppercase tracking-widest mt-6 mb-3">
          빠른 이동
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {[
            { href: "/settlements", label: "정산 승인하기", accent: "#FFE566", desc: "승인 대기 건 처리" },
            { href: "/messages",    label: "에스컬레이션 답변", accent: "#FF6B6B", desc: "미처리 문의 확인" },
            { href: "/quotes",      label: "견적 검토",    accent: "#5B8DEF",  desc: "수동 검토 필요 견적" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center justify-between bg-[#1A1D27] border-2 border-white/10 px-4 py-3 active:translate-y-0.5 transition-transform"
              style={{ boxShadow: "3px 3px 0px rgba(255,255,255,0.05)" }}
            >
              <div>
                <p className="font-black text-sm text-white">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
              <span className="text-lg font-black" style={{ color: item.accent }}>→</span>
            </a>
          ))}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

export default function DashboardPage() {
  return <AuthGuard>{(user) => <Dashboard user={user} />}</AuthGuard>;
}
