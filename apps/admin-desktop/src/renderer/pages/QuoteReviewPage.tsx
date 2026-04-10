/**
 * PROMPT-08: 수동 보정 UI
 * /quotes/:id/review
 * - 좌측: 원본 파일 미리보기 (PDF iframe / 이미지)
 * - 우측: 추출된 항목 편집 폼
 * - 하단: "보정 완료" → API PUT /quotes/:id/normalize
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { quotesApi } from "../lib/api";
import { Button, ErrorAlert, LoadingSpinner, PageHeader } from "../components/ui";

interface LineItem {
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface QuoteDetail {
  id: string;
  file_url: string | null;
  file_name: string | null;
  parsed_total: number | null;
  parse_status: string;
  submission_type: string;
  line_items_json: LineItem[];
}

export function QuoteReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    quotesApi.get(id).then((q: QuoteDetail) => {
      setQuote(q);
      setItems(q.line_items_json?.length ? q.line_items_json : [{ item_name: "", unit: "식", quantity: 1, unit_price: 0, amount: 0 }]);
    }).catch(() => setError("견적 정보를 불러오지 못했습니다.")).finally(() => setLoading(false));
  }, [id]);

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
    setItems((p) => [...p, { item_name: "", unit: "식", quantity: 1, unit_price: 0, amount: 0 }]);
  }

  function removeRow(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  const total = items.reduce((s, r) => s + (r.amount || 0), 0);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      await quotesApi.normalize(id, { line_items: items, parsed_total: total });
      navigate(-1);
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const isPreviewable =
    quote?.file_url &&
    (quote.submission_type === "pdf" || quote.file_name?.endsWith(".pdf"));

  return (
    <div>
      <PageHeader
        title="견적서 수동 보정"
        actions={<Button variant="ghost" onClick={() => navigate(-1)}>← 뒤로</Button>}
      />
      {error && <ErrorAlert message={error} />}

      <div className="p-6 flex gap-6 h-[calc(100vh-12rem)]">
        {/* 좌측: 원본 파일 미리보기 */}
        <div className="w-1/2 flex flex-col">
          <p className="text-xs text-gray-500 mb-2">원본 파일 미리보기</p>
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {isPreviewable ? (
              <iframe
                src={`http://localhost:8000${quote!.file_url}`}
                className="w-full h-full"
                title="견적서 원본"
              />
            ) : quote?.file_url &&
              (quote.file_name?.match(/\.(jpg|jpeg|png)$/i)) ? (
              <img
                src={`http://localhost:8000${quote.file_url}`}
                alt="견적서 원본"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                {quote?.submission_type === "hwp"
                  ? "HWP 파일은 미리보기를 지원하지 않습니다"
                  : "미리보기 없음"}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 편집 폼 */}
        <div className="w-1/2 flex flex-col">
          <p className="text-xs text-gray-500 mb-2">항목 편집</p>
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-3 py-2">항목명</th>
                  <th className="text-left px-3 py-2 w-14">단위</th>
                  <th className="text-right px-3 py-2 w-16">수량</th>
                  <th className="text-right px-3 py-2 w-24">단가</th>
                  <th className="text-right px-3 py-2 w-24">금액</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5">
                      <input
                        value={row.item_name}
                        onChange={(e) => updateItem(i, "item_name", e.target.value)}
                        className="w-full bg-transparent text-gray-200 focus:outline-none text-sm"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={row.unit}
                        onChange={(e) => updateItem(i, "unit", e.target.value)}
                        className="w-full bg-transparent text-gray-400 focus:outline-none text-xs text-center"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                        className="w-full bg-transparent text-gray-200 focus:outline-none text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        value={row.unit_price}
                        onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                        className="w-full bg-transparent text-gray-200 focus:outline-none text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-300">{row.amount.toLocaleString()}</td>
                    <td className="px-2 py-1.5">
                      {items.length > 1 && (
                        <button onClick={() => removeRow(i)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700">
                  <td colSpan={4} className="px-3 py-2 text-right text-xs text-gray-500">합계</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-blue-400">{total.toLocaleString()}원</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div className="px-3 py-2 border-t border-gray-800">
              <button onClick={addRow} className="text-xs text-blue-500 hover:text-blue-400">+ 항목 추가</button>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="mt-4">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "저장 중..." : "보정 완료 → 저장"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
