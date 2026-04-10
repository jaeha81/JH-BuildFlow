"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import MobileNav from "@/components/MobileNav";
import { quoteApi, type Quote } from "@/lib/api";

const PARSE_STATUS: Record<string, { label: string; color: string }> = {
  success:       { label: "파싱완료",   color: "#4ADE80" },
  failed:        { label: "파싱실패",   color: "#FF6B6B" },
  manual_review: { label: "수동검토",   color: "#FFE566" },
  pending:       { label: "대기중",     color: "#5B8DEF" },
};

function QuotesContent() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewOnly, setShowReviewOnly] = useState(false);

  useEffect(() => {
    quoteApi.list().then(setQuotes).finally(() => setLoading(false));
  }, []);

  const displayQuotes = showReviewOnly
    ? quotes.filter((q) => q.manual_review_required)
    : quotes;

  const reviewCount = quotes.filter((q) => q.manual_review_required).length;

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <header className="bg-[#1A1D27] border-b-2 border-white/10 px-4 py-4">
        <h1 className="text-base font-black text-white">견적 검토</h1>
        <p className="text-xs text-white/40 mt-0.5">
          전체 {quotes.length}건
          {reviewCount > 0 && (
            <span className="ml-2 text-[#FFE566] font-bold">수동검토 {reviewCount}건</span>
          )}
        </p>
      </header>

      {/* 토글 */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
        <button
          onClick={() => setShowReviewOnly(!showReviewOnly)}
          className={`px-3 py-1.5 text-xs font-bold border-2 transition-colors ${
            showReviewOnly
              ? "bg-[#FFE566] border-[#FFE566] text-black"
              : "bg-transparent border-white/20 text-white/50"
          }`}
        >
          수동검토만 보기
        </button>
        {!showReviewOnly && (
          <button
            onClick={() => setShowReviewOnly(false)}
            className="px-3 py-1.5 text-xs font-bold border-2 bg-[#5B8DEF] border-[#5B8DEF] text-white"
          >
            전체 보기
          </button>
        )}
      </div>

      <main className="page-content px-4 pt-3 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-[#1A1D27] border-2 border-white/10 animate-pulse" />
          ))
        ) : displayQuotes.length === 0 ? (
          <div className="text-center py-16 text-white/30 font-bold">견적이 없습니다</div>
        ) : (
          displayQuotes.map((q) => {
            const st = PARSE_STATUS[q.parse_status] ?? { label: q.parse_status, color: "#666" };
            return (
              <div
                key={q.id}
                className="bg-[#1A1D27] border-2 border-white/10 px-4 py-3"
                style={{ borderLeftColor: st.color, borderLeftWidth: 4 }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {q.id.slice(0, 8)}…
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      유형: {q.submission_type} ·{" "}
                      {q.parsed_total != null
                        ? `${q.parsed_total.toLocaleString()}원`
                        : "금액 미확인"}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {new Date(q.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-xs font-black px-2 py-1 border-2"
                      style={{ color: st.color, borderColor: st.color }}
                    >
                      {st.label}
                    </span>
                    {q.manual_review_required && (
                      <span className="text-xs bg-[#FFE566] text-black font-black px-1.5 py-0.5">
                        검토필요
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      <MobileNav />
    </div>
  );
}

export default function QuotesPage() {
  return <AuthGuard>{() => <QuotesContent />}</AuthGuard>;
}
