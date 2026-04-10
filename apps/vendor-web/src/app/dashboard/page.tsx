"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { bidRequestApi, type BidRequest } from "@/lib/api";
import { VendorNav } from "@/components/VendorNav";
import { Badge, LoadingSpinner, ErrorAlert } from "@/components/ui";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "info" }> = {
  pending:  { label: "대기 중", variant: "warning" },
  accepted: { label: "참여", variant: "success" },
  rejected: { label: "거절", variant: "error" },
  on_hold:  { label: "보류", variant: "default" },
  expired:  { label: "마감", variant: "error" },
};

const SUMMARY_CARDS = [
  { key: "total",    label: "전체 발주", color: "bg-[#5B8DEF]", textColor: "text-white" },
  { key: "pending",  label: "응답 대기", color: "bg-[#FFE566]", textColor: "text-black" },
  { key: "accepted", label: "참여 중",   color: "bg-[#4ADE80]", textColor: "text-black" },
];

export default function DashboardPage() {
  const [bids, setBids] = useState<BidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    bidRequestApi.list()
      .then(setBids)
      .catch(() => setError("발주 현황을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total:    bids.length,
    pending:  bids.filter((b) => b.response_status === "pending").length,
    accepted: bids.filter((b) => b.response_status === "accepted").length,
  };

  return (
    <>
      <VendorNav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-4">
          {SUMMARY_CARDS.map((card) => (
            <div
              key={card.key}
              className={`${card.color} ${card.textColor} border-2 border-black p-4 shadow-[4px_4px_0px_#000]`}
            >
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">{card.label}</p>
              <p className="text-3xl font-black mt-1">{counts[card.key as keyof typeof counts]}</p>
            </div>
          ))}
        </div>

        {error && <ErrorAlert message={error} />}

        {/* 발주 목록 */}
        <div className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
          {/* 헤더 */}
          <div className="px-5 py-4 border-b-2 border-black flex items-center justify-between bg-[#1A1D27]">
            <h2 className="font-black text-white uppercase tracking-wide text-sm">최근 발주</h2>
            <Link
              href="/bid-requests"
              className="text-xs font-bold text-[#5B8DEF] border-2 border-[#5B8DEF] px-2 py-1
                hover:bg-[#5B8DEF] hover:text-white transition-colors"
            >
              전체 보기 →
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : bids.length === 0 ? (
            <p className="text-sm font-bold text-gray-400 text-center py-10">수신된 발주가 없습니다</p>
          ) : (
            <div className="divide-y-2 divide-black">
              {bids.slice(0, 5).map((b) => {
                const st = STATUS_MAP[b.response_status] ?? { label: b.response_status, variant: "default" as const };
                return (
                  <Link
                    key={b.id}
                    href={`/bid-requests/${b.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F0E8] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-black text-black">{b.trade_type ?? "공종 미정"}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">
                        {b.deadline ? `마감: ${new Date(b.deadline).toLocaleDateString("ko-KR")}` : "마감일 없음"}
                      </p>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
