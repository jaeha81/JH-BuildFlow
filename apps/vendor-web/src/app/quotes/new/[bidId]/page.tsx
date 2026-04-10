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
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="text-xs text-gray-400 hover:text-gray-600">← 뒤로</button>
        </div>

        <div>
          <h1 className="text-lg font-semibold text-gray-900">견적서 제출</h1>
          {bid && <p className="text-xs text-gray-400 mt-0.5">{bid.trade_type ?? "공종 미정"} · {bid.project_name ?? "프로젝트"}</p>}
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
              className={`p-3 rounded-xl border text-left transition-colors ${
                type === key
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className={`text-sm font-medium ${type === key ? "text-blue-700" : "text-gray-700"}`}>{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* 템플릿 직접 입력 */}
        {type === "template" && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="text-left px-3 py-2 w-8">#</th>
                    <th className="text-left px-3 py-2">항목명</th>
                    <th className="text-left px-3 py-2 w-16">단위</th>
                    <th className="text-right px-3 py-2 w-20">수량</th>
                    <th className="text-right px-3 py-2 w-28">단가</th>
                    <th className="text-right px-3 py-2 w-28">금액</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={row.item_name}
                          onChange={(e) => updateItem(i, "item_name", e.target.value)}
                          placeholder="항목명"
                          className="w-full border-0 focus:outline-none text-sm text-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.unit}
                          onChange={(e) => updateItem(i, "unit", e.target.value)}
                          className="w-full border-0 focus:outline-none text-sm text-gray-600 text-center"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                          className="w-full border-0 focus:outline-none text-sm text-gray-800 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.unit_price}
                          onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                          className="w-full border-0 focus:outline-none text-sm text-gray-800 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm text-gray-700">{row.amount.toLocaleString()}</td>
                      <td className="px-2 py-2">
                        {items.length > 1 && (
                          <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={5} className="px-3 py-2 text-xs font-medium text-gray-600 text-right">합계</td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-blue-700">{formatKRW(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-gray-100">
              <button onClick={addRow} className="text-xs text-blue-600 hover:underline">+ 항목 추가</button>
            </div>
          </div>
        )}

        {/* 파일 업로드 */}
        {(type === "pdf" || type === "excel") && (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 transition-colors"
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
                <p className="text-sm font-medium text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl mb-2">{type === "pdf" ? "📄" : "📊"}</p>
                <p className="text-sm text-gray-600">클릭하여 파일 선택</p>
                <p className="text-xs text-gray-400 mt-1">{type === "pdf" ? "PDF 파일" : "Excel (.xlsx, .xls)"}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "제출 중..." : "견적서 제출"}
        </button>
      </main>
    </>
  );
}
