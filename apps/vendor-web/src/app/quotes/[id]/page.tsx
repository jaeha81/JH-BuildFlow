"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { quoteApi } from "@/lib/api";
import { VendorNav } from "@/components/VendorNav";
import { Badge, LoadingSpinner, ErrorAlert } from "@/components/ui";

const PARSE_STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "info" }> = {
  pending:       { label: "파싱 대기", variant: "warning" },
  completed:     { label: "파싱 완료", variant: "success" },
  failed:        { label: "파싱 실패", variant: "error" },
  manual_review: { label: "수동 검토 필요", variant: "info" },
};

const TYPE_LABEL: Record<string, string> = {
  template: "직접 입력",
  pdf: "PDF 업로드",
  excel: "Excel 업로드",
  hwp: "HWP 업로드",
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<{ id: string; parsed_total: number; parse_status: string; submission_type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    quoteApi.get(id)
      .then(setQuote)
      .catch(() => setError("견적 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <><VendorNav /><LoadingSpinner /></>;

  const st = quote ? (PARSE_STATUS[quote.parse_status] ?? { label: quote.parse_status, variant: "default" as const }) : null;

  return (
    <>
      <VendorNav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="text-xs font-black text-black border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
        >
          ← 뒤로
        </button>

        {error && <ErrorAlert message={error} />}

        {quote && (
          <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000] space-y-4">
            <div className="flex items-start justify-between">
              <h1 className="text-lg font-black text-black uppercase tracking-wide">제출된 견적서</h1>
              {st && <Badge variant={st.variant}>{st.label}</Badge>}
            </div>

            <div className="divide-y-2 divide-black/10">
              {[
                { label: "제출 방식", value: TYPE_LABEL[quote.submission_type] ?? quote.submission_type },
                { label: "견적 합계", value: quote.parsed_total ? `${quote.parsed_total.toLocaleString("ko-KR")}원` : "파싱 중..." },
              ].map(({ label, value }) => (
                <div key={label} className="py-3 flex gap-4">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wide w-24 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-black font-bold">{value}</span>
                </div>
              ))}
            </div>

            {quote.parse_status === "manual_review" && (
              <div className="bg-[#FFE566] border-2 border-black p-3 shadow-[3px_3px_0px_#000]">
                <p className="text-xs font-black text-black">
                  ⚠ HWP 파일은 자동 파싱이 지원되지 않습니다. 담당자가 수동으로 검토합니다.
                </p>
              </div>
            )}

            <div className="bg-[#5B8DEF] border-2 border-black p-3 shadow-[3px_3px_0px_#000]">
              <p className="text-xs font-black text-white">
                ✓ 견적서가 성공적으로 접수되었습니다. 담당자 검토 후 연락드립니다.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
