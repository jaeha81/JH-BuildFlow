"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import MobileNav from "@/components/MobileNav";
import { settlementApi, type Settlement, type UserMe } from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: "대기",   color: "#FFE566" },
  approved: { label: "승인",   color: "#4ADE80" },
  rejected: { label: "반려",   color: "#FF6B6B" },
  completed:{ label: "완료",   color: "#5B8DEF" },
};

function SettlementsContent({ user }: { user: UserMe }) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("pending");

  const canApprove = isSuperAdmin(user.role);

  useEffect(() => {
    settlementApi.list().then(setSettlements).finally(() => setLoading(false));
  }, []);

  async function handleApprove(s: Settlement) {
    if (!canApprove) return;
    if (!confirm(`${s.amount.toLocaleString()}원 정산을 승인하시겠습니까?`)) return;
    setApproving(s.id);
    try {
      const updated = await settlementApi.approve(s.id, s.amount);
      setSettlements((prev) => prev.map((item) => (item.id === s.id ? updated : item)));
    } catch (err) {
      alert("승인 실패: " + String(err));
    } finally {
      setApproving(null);
    }
  }

  const filtered = filterStatus === "all"
    ? settlements
    : settlements.filter((s) => s.status === filterStatus);

  const pendingCount = settlements.filter((s) => s.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <header className="bg-[#1A1D27] border-b-2 border-white/10 px-4 py-4">
        <h1 className="text-base font-black text-white">정산 승인</h1>
        <p className="text-xs text-white/40 mt-0.5">
          {canApprove ? "super_admin 승인 권한" : "조회 전용"}
          {pendingCount > 0 && (
            <span className="ml-2 text-[#FFE566] font-bold">대기 {pendingCount}건</span>
          )}
        </p>
      </header>

      {/* 필터 */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-white/5">
        {["all", "pending", "approved", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`shrink-0 px-3 py-1.5 text-xs font-bold border-2 transition-colors ${
              filterStatus === s
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
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#1A1D27] border-2 border-white/10 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30 font-bold">정산 내역이 없습니다</div>
        ) : (
          filtered.map((s) => {
            const st = STATUS_LABEL[s.status] ?? { label: s.status, color: "#666" };
            return (
              <div
                key={s.id}
                className="bg-[#1A1D27] border-2 border-white/10 px-4 py-3"
                style={{ borderLeftColor: st.color, borderLeftWidth: 4 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {s.amount.toLocaleString()}원
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      {s.tax_invoice_number && ` · 계산서 ${s.tax_invoice_number}`}
                    </p>
                  </div>
                  <span
                    className="text-xs font-black px-2 py-1 border-2"
                    style={{ color: st.color, borderColor: st.color }}
                  >
                    {st.label}
                  </span>
                </div>

                {canApprove && s.status === "pending" && (
                  <button
                    onClick={() => handleApprove(s)}
                    disabled={approving === s.id}
                    className="w-full mt-1 bg-[#4ADE80] border-2 border-white text-black font-black text-sm py-2 active:translate-y-0.5 transition-transform disabled:opacity-50"
                    style={{ boxShadow: approving === s.id ? "none" : "3px 3px 0px #fff" }}
                  >
                    {approving === s.id ? "처리 중..." : "승인"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>

      <MobileNav />
    </div>
  );
}

export default function SettlementsPage() {
  return <AuthGuard>{(user) => <SettlementsContent user={user} />}</AuthGuard>;
}
