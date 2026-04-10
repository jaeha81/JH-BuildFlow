"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import MobileNav from "@/components/MobileNav";
import { bidApi, type BidRequest } from "@/lib/api";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "대기",   color: "#FFE566" },
  accepted:  { label: "수락",   color: "#4ADE80" },
  rejected:  { label: "거절",   color: "#FF6B6B" },
  on_hold:   { label: "보류",   color: "#5B8DEF" },
  no_response: { label: "미응답", color: "#666" },
};

function BidsContent() {
  const [bids, setBids] = useState<BidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    bidApi.list().then(setBids).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? bids : bids.filter((b) => b.response_status === filter);

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <header className="bg-[#1A1D27] border-b-2 border-white/10 px-4 py-4">
        <h1 className="text-base font-black text-white">발주 현황</h1>
        <p className="text-xs text-white/40 mt-0.5">전체 {bids.length}건</p>
      </header>

      {/* 필터 탭 */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-white/5">
        {["all", "pending", "accepted", "rejected", "no_response"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-3 py-1.5 text-xs font-bold border-2 transition-colors ${
              filter === s
                ? "bg-[#5B8DEF] border-[#5B8DEF] text-white"
                : "bg-transparent border-white/20 text-white/50"
            }`}
          >
            {s === "all" ? "전체" : STATUS_LABEL[s]?.label ?? s}
          </button>
        ))}
      </div>

      <main className="page-content px-4 pt-3 space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[#1A1D27] border-2 border-white/10 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30 font-bold">해당 건이 없습니다</div>
        ) : (
          filtered.map((bid) => {
            const st = STATUS_LABEL[bid.response_status] ?? { label: bid.response_status, color: "#666" };
            const deadline = bid.deadline ? new Date(bid.deadline).toLocaleDateString("ko-KR") : "-";
            const isOverdue = bid.deadline && new Date(bid.deadline) < new Date() && bid.response_status === "pending";
            return (
              <div
                key={bid.id}
                className="bg-[#1A1D27] border-2 border-white/10 px-4 py-3 flex items-center justify-between"
                style={{ borderLeftColor: st.color, borderLeftWidth: 4 }}
              >
                <div>
                  <p className="text-sm font-bold text-white">
                    발주 {bid.id.slice(0, 8)}…
                    {isOverdue && (
                      <span className="ml-2 text-xs bg-[#FF6B6B] text-white px-1.5 py-0.5 font-black">마감초과</span>
                    )}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">마감 {deadline}</p>
                </div>
                <span
                  className="text-xs font-black px-2 py-1 border-2"
                  style={{ color: st.color, borderColor: st.color }}
                >
                  {st.label}
                </span>
              </div>
            );
          })
        )}
      </main>

      <MobileNav />
    </div>
  );
}

export default function BidsPage() {
  return <AuthGuard>{() => <BidsContent />}</AuthGuard>;
}
