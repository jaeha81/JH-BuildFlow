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

function deadline(d: string | null): string {
  if (!d) return "마감일 없음";
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "마감 완료";
  if (diff === 0) return "오늘 마감";
  return `D-${diff}`;
}

export default function BidRequestsPage() {
  const [bids, setBids] = useState<BidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "accepted">("all");

  useEffect(() => {
    bidRequestApi.list()
      .then(setBids)
      .catch(() => setError("발주 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? bids : bids.filter((b) => b.response_status === filter);

  return (
    <>
      <VendorNav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">발주 수신함</h1>
          <div className="flex gap-1">
            {(["all", "pending", "accepted"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "전체" : f === "pending" ? "대기 중" : "참여 중"}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">수신된 발주가 없습니다</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {filtered.map((b) => {
              const st = STATUS_MAP[b.response_status] ?? { label: b.response_status, variant: "default" as const };
              const d = deadline(b.deadline);
              const isUrgent = b.deadline && Math.ceil((new Date(b.deadline).getTime() - Date.now()) / 86400000) <= 2;
              return (
                <Link
                  key={b.id}
                  href={`/bid-requests/${b.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-800">{b.trade_type ?? "공종 미정"}</p>
                    <p className="text-xs text-gray-400">{b.project_name ?? "프로젝트명 없음"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${isUrgent ? "text-red-500" : "text-gray-400"}`}>{d}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
