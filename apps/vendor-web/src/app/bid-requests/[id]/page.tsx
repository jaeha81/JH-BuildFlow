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
  const isUrgent = bid?.deadline && new Date(bid.deadline).getTime() - Date.now() < 172800000;

  return (
    <>
      <VendorNav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="text-xs font-black text-black border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
        >
          ← 목록
        </button>

        {error && <ErrorAlert message={error} />}

        {bid && (
          <>
            {/* 헤더 */}
            <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000] space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-black text-black">{bid.trade_type ?? "공종 미정"}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{bid.project_name ?? "프로젝트명 없음"}</p>
                </div>
                {st && <Badge variant={st.variant}>{st.label}</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`border-2 p-3 ${isUrgent ? "bg-[#FF6B6B] border-black text-white" : "bg-[#F5F0E8] border-black"}`}>
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">마감까지</p>
                  <p className="text-sm font-black">
                    <Countdown deadline={bid.deadline} />
                  </p>
                </div>
                <div className="bg-[#F5F0E8] border-2 border-black p-3">
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">마감일</p>
                  <p className="text-sm font-black text-black">
                    {bid.deadline ? new Date(bid.deadline).toLocaleDateString("ko-KR") : "없음"}
                  </p>
                </div>
              </div>

              {bid.bid_package?.instructions && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">발주 지시사항</p>
                  <p className="text-sm font-medium text-black whitespace-pre-wrap bg-[#F5F0E8] border-2 border-black p-3">
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
                  className="flex-1 py-3 bg-[#4ADE80] text-black text-sm font-black border-2 border-black
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                    disabled:opacity-50 transition-all uppercase tracking-wide"
                >
                  참여하기
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={responding}
                  className="px-4 py-3 bg-white text-black text-sm font-black border-2 border-black
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none disabled:opacity-50 transition-all"
                >
                  거절
                </button>
                <button
                  onClick={() => respond("on_hold")}
                  disabled={responding}
                  className="px-4 py-3 bg-[#FFE566] text-black text-sm font-black border-2 border-black
                    shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none disabled:opacity-50 transition-all"
                >
                  보류
                </button>
              </div>
            )}

            {showRejectForm && (
              <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000] space-y-3">
                <p className="text-sm font-black text-black uppercase tracking-wide">거절 사유 (선택)</p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="거절 사유를 입력하세요"
                  rows={3}
                  className="w-full border-2 border-black px-3 py-2 text-sm font-medium resize-none focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => respond("rejected")}
                    disabled={responding}
                    className="flex-1 py-2 bg-[#FF6B6B] text-white text-sm font-black border-2 border-black
                      shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]
                      disabled:opacity-50 transition-all"
                  >
                    거절 확인
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-4 py-2 bg-white text-black text-sm font-black border-2 border-black hover:bg-[#F5F0E8] transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 참여 후 견적 제출 링크 */}
            {bid.response_status === "accepted" && (
              <div className="bg-[#5B8DEF] border-2 border-black p-4 shadow-[4px_4px_0px_#000] flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-white">참여 확정</p>
                  <p className="text-xs font-bold text-white/80 mt-0.5">견적서를 제출해주세요</p>
                </div>
                <Link
                  href={`/quotes/new/${bid.id}`}
                  className="px-4 py-2 bg-white text-black text-sm font-black border-2 border-black
                    shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]
                    active:shadow-none transition-all"
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
