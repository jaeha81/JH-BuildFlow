"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import MobileNav from "@/components/MobileNav";
import { vendorApi, type Vendor } from "@/lib/api";

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#4ADE80" : pct >= 40 ? "#FFE566" : "#FF6B6B";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-white/10">
        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-black" style={{ color }}>{pct}</span>
    </div>
  );
}

function VendorsContent() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    vendorApi.list().then(setVendors).finally(() => setLoading(false));
  }, []);

  const filtered = vendors.filter((v) =>
    v.company_name.includes(search) ||
    v.trade_types.some((t) => t.includes(search))
  );

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <header className="bg-[#1A1D27] border-b-2 border-white/10 px-4 py-4">
        <h1 className="text-base font-black text-white">협력사</h1>
        <p className="text-xs text-white/40 mt-0.5">전체 {vendors.length}개 업체</p>
      </header>

      {/* 검색 */}
      <div className="px-4 py-3 border-b border-white/5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="업체명 또는 공종 검색..."
          className="w-full bg-[#0F1117] border-2 border-white/20 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#5B8DEF]"
        />
      </div>

      <main className="page-content px-4 pt-3 space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[#1A1D27] border-2 border-white/10 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30 font-bold">검색 결과가 없습니다</div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              className="bg-[#1A1D27] border-2 border-white/10 px-4 py-3"
              style={{ boxShadow: "3px 3px 0px rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">{v.company_name}</p>
                    {!v.is_active && (
                      <span className="text-xs bg-[#FF6B6B] text-white font-black px-1 py-0.5">비활성</span>
                    )}
                    {v.is_verified && (
                      <span className="text-xs bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80] font-bold px-1 py-0.5">인증</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {v.trade_types.slice(0, 3).join(" · ")}
                    {v.trade_types.length > 3 && ` +${v.trade_types.length - 3}`}
                  </p>
                  {v.rating != null && <ScoreBar score={v.rating} />}
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <MobileNav />
    </div>
  );
}

export default function VendorsPage() {
  return <AuthGuard>{() => <VendorsContent />}</AuthGuard>;
}
