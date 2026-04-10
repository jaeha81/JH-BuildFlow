"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

function Countdown({ deadline }: { deadline: string | null }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!deadline) { setRemaining("마감일 없음"); return; }
    function update() {
      const ms = new Date(deadline!).getTime() - Date.now();
      if (ms <= 0) { setRemaining("마감 완료"); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setRemaining(d > 0 ? `D-${d} ${h}시간 ${m}분` : `${h}시간 ${m}분`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deadline]);

  return <span>{remaining}</span>;
}

type BidDetail = BidRequest & { bid_package?: { documents: unknown[]; instructions: string } };

export default function BidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bid, setBid] = useState<BidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState(false);
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    bidRequestApi.get(id)
      .then(setBid)
      .catch(() => setError("발주 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  async function respond(status: "accepted" | "rejected" | "on_hold") {
    if (!id) return;
    setResponding(true);
    try {
      await bidRequestApi.respond(id, status, reason || undefined);
      setBid((prev) => prev ? { ...prev, response_status: status } : prev);
      setShowRejectForm(false);
    } catch {
      setError("응답 처리 중 오류가 발생했습니다.");
    } finally {
      setResponding(false);
    }
  }

  if (loading) return <><VendorNav /><LoadingSpinner /></>;

  const st = bid ? (STATUS_MAP[bid.response_status] ?? { label: bid.response_status, variant: "default" as const }) : null;
  const canRespond = bid?.response_status === "pending";

  return (
    <>
      <VendorNav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="text-xs text-gray-400 hover:text-gray-600">← 목록</button>
        </div>

        {error && <ErrorAlert message={error} />}

        {bid && (
          <>
            {/* 헤더 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{bid.trade_type ?? "공종 미정"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{bid.project_name ?? "프로젝트명 없음"}</p>
                </div>
                {st && <Badge variant={st.variant}>{st.label}</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">마감까지</p>
                  <p className={`text-sm font-semibold ${bid.deadline && new Date(bid.deadline).getTime() - Date.now() < 172800000 ? "text-red-500" : "text-gray-800"}`}>
                    <Countdown deadline={bid.deadline} />
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">마감일</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {bid.deadline ? new Date(bid.deadline).toLocaleDateString("ko-KR") : "없음"}
                  </p>
                </div>
              </div>

              {bid.bid_package?.instructions && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-1">발주 지시사항</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {bid.bid_package.instructions}
                  </p>
                </div>
              )}
            </div>

            {/* 응답 버튼 */}
            {canRespond && !showRejectForm && (
              <div className="flex gap-2">
                <button
                  onClick={() => respond("accepted")}
                  disabled={responding}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  참여하기
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={responding}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  거절
                </button>
                <button
                  onClick={() => respond("on_hold")}
                  disabled={responding}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  보류
                </button>
              </div>
            )}

            {showRejectForm && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">거절 사유 (선택)</p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="거절 사유를 입력하세요"
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => respond("rejected")}
                    disabled={responding}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    거절 확인
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 참여 후 견적 제출 링크 */}
            {bid.response_status === "accepted" && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">참여 확정</p>
                  <p className="text-xs text-blue-600 mt-0.5">견적서를 제출해주세요</p>
                </div>
                <Link
                  href={`/quotes/new/${bid.id}`}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  견적 제출 →
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
