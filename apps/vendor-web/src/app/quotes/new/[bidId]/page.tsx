"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { bidRequestApi, quoteApi, type BidRequest } from "@/lib/api";
import { VendorNav } from "@/components/VendorNav";
import { ErrorAlert } from "@/components/ui";

type LineItem = { item_name: string; unit: string; quantity: number; unit_price: number; amount: number };
type SubmitType = "template" | "pdf" | "excel";

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function QuoteNewPage() {
  const { bidId } = useParams<{ bidId: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bid, setBid] = useState<BidRequest | null>(null);
  const [type, setType] = useState<SubmitType>("template");
  const [items, setItems] = useState<LineItem[]>([
    { item_name: "", unit: "식", quantity: 1, unit_price: 0, amount: 0 },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bidId) return;
    bidRequestApi.get(bidId).then(setBid).catch(() => {});
  }, [bidId]);

  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unit_price") {
          updated.amount = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      })
    );
  }

  function addRow() {
    setItems((prev) => [...prev, { item_name: "", unit: "식", quantity: 1, unit_price: 0, amount: 0 }]);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = items.reduce((s, r) => s + (r.amount || 0), 0);

  async function handleSubmit() {
    if (!bidId) return;
    setSubmitting(true);
    setError("");
    try {
      if (type === "template") {
        const valid = items.every((r) => r.item_name.trim());
        if (!valid) { setError("모든 항목명을 입력해주세요."); setSubmitting(false); return; }
        const result = await quoteApi.submit({
          bid_request_id: bidId,
          submission_type: "template",
          line_items: items,
        });
        router.push(`/quotes/${result.id}`);
      } else {
        if (!file) { setError("파일을 선택해주세요."); setSubmitting(false); return; }
        const result = await quoteApi.submit({
          bid_request_id: bidId,
          submission_type: type,
        });
        router.push(`/quotes/${result.id}`);
      }
    } catch {
      setError("견적 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

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

        <div>
          <h1 className="text-lg font-black text-black uppercase tracking-wide">견적서 제출</h1>
          {bid && <p className="text-xs font-bold text-gray-500 mt-0.5">{bid.trade_type ?? "공종 미정"} · {bid.project_name ?? "프로젝트"}</p>}
        </div>

        {error && <ErrorAlert message={error} />}

        {/* 제출 방식 선택 */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "template" as SubmitType, label: "직접 입력", desc: "항목별 단가 입력" },
            { key: "pdf" as SubmitType, label: "PDF 업로드", desc: "견적서 PDF 첨부" },
            { key: "excel" as SubmitType, label: "Excel 업로드", desc: ".xlsx 파일 첨부" },
          ]).map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => { setType(key); setFile(null); }}
              className={`p-3 border-2 text-left transition-all ${
                type === key
                  ? "border-black bg-[#5B8DEF] text-white shadow-[3px_3px_0px_#000]"
                  : "border-black bg-white text-black hover:bg-[#F5F0E8]"
              }`}
            >
              <p className="text-sm font-black">{label}</p>
              <p className="text-xs font-medium mt-0.5 opacity-70">{desc}</p>
            </button>
          ))}
        </div>

        {/* 템플릿 직접 입력 */}
        {type === "template" && (
          <div className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-black text-xs text-white uppercase tracking-wide font-black">
                    <th className="text-left px-3 py-2 w-8">#</th>
                    <th className="text-left px-3 py-2">항목명</th>
                    <th className="text-left px-3 py-2 w-16">단위</th>
                    <th className="text-right px-3 py-2 w-20">수량</th>
                    <th className="text-right px-3 py-2 w-28">단가</th>
                    <th className="text-right px-3 py-2 w-28">금액</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10">
                  {items.map((row, i) => (
                    <tr key={i} className="hover:bg-[#F5F0E8]">
                      <td className="px-3 py-2 text-gray-400 text-xs font-bold">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={row.item_name}
                          onChange={(e) => updateItem(i, "item_name", e.target.value)}
                          placeholder="항목명"
                          className="w-full border-0 focus:outline-none text-sm font-medium text-black bg-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.unit}
                          onChange={(e) => updateItem(i, "unit", e.target.value)}
                          className="w-full border-0 focus:outline-none text-sm font-medium text-black text-center bg-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                          className="w-full border-0 focus:outline-none text-sm font-medium text-black text-right bg-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.unit_price}
                          onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                          className="w-full border-0 focus:outline-none text-sm font-medium text-black text-right bg-transparent"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-black text-black">{row.amount.toLocaleString()}</td>
                      <td className="px-2 py-2">
                        {items.length > 1 && (
                          <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-[#FF6B6B] text-xs font-black">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black bg-[#F5F0E8]">
                    <td colSpan={5} className="px-3 py-2 text-xs font-black text-black text-right uppercase tracking-wide">합계</td>
                    <td className="px-3 py-2 text-right text-sm font-black text-[#5B8DEF]">{formatKRW(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-3 py-2 border-t-2 border-black/10">
              <button
                onClick={addRow}
                className="text-xs font-black text-[#5B8DEF] border-2 border-[#5B8DEF] px-2 py-0.5
                  hover:bg-[#5B8DEF] hover:text-white transition-colors"
              >
                + 항목 추가
              </button>
            </div>
          </div>
        )}

        {/* 파일 업로드 */}
        {(type === "pdf" || type === "excel") && (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-black p-8 text-center cursor-pointer
              hover:bg-[#F5F0E8] shadow-[4px_4px_0px_#000] transition-colors"
          >
            <input
              ref={fileRef}
              type="file"
              accept={type === "pdf" ? ".pdf" : ".xlsx,.xls"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {file ? (
              <div>
                <p className="text-sm font-black text-black">{file.name}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl mb-2">{type === "pdf" ? "📄" : "📊"}</p>
                <p className="text-sm font-black text-black">클릭하여 파일 선택</p>
                <p className="text-xs font-bold text-gray-500 mt-1">{type === "pdf" ? "PDF 파일" : "Excel (.xlsx, .xls)"}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-black text-white text-sm font-black uppercase tracking-wide border-2 border-black
            shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px]
            active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
            disabled:opacity-50 transition-all"
        >
          {submitting ? "제출 중..." : "견적서 제출"}
        </button>
      </main>
    </>
  );
}
