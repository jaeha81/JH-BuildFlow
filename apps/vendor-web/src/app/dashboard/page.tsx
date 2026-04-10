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

  const pending = bids.filter((b) => b.response_status === "pending").length;

  return (
    <>
      <VendorNav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* 요약 */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "전체 발주", value: bids.length },
            { label: "응답 대기", value: pending },
            { label: "참여 중", value: bids.filter((b) => b.response_status === "accepted").length },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {error && <ErrorAlert message={error} />}

        {/* 발주 목록 */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-800">최근 발주</h2>
            <Link href="/bid-requests" className="text-xs text-blue-600 hover:underline">전체 보기</Link>
          </div>
          {loading ? <LoadingSpinner /> : bids.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">수신된 발주가 없습니다</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {bids.slice(0, 5).map((b) => {
                const st = STATUS_MAP[b.response_status] ?? { label: b.response_status, variant: "default" as const };
                return (
                  <Link key={b.id} href={`/bid-requests/${b.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{b.trade_type ?? "공종 미정"}</p>
                      <p className="text-xs text-gray-400">{b.deadline ? `마감: ${new Date(b.deadline).toLocaleDateString()}` : "마감일 없음"}</p>
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
