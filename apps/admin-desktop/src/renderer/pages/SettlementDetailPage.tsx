/**
 * PROMPT-10: 정산 상세 + 승인 워크플로 (/settlements/:id)
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi } from "../lib/api";
import { Badge, Button, ErrorAlert, LoadingSpinner, PageHeader } from "../components/ui";

interface Settlement {
  id: string;
  project_id: string;
  vendor_id: string;
  milestone_type: string;
  requested_amount: number;
  approved_amount: number | null;
  invoice_file: string | null;
  tax_review_status: string;
  status: string;
  payout_scheduled_date: string | null;
  payout_approved_by: string | null;
  payout_approved_at: string | null;
  reject_reason: string | null;
}

const MILESTONE_LABEL: Record<string, string> = { advance: "선금", interim: "중도금", final: "잔금" };

export function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [s, setS] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  // 승인 폼 상태
  const [approvedAmount, setApprovedAmount] = useState("");
  const [payoutDate, setPayoutDate] = useState("");
  const [showApproveForm, setShowApproveForm] = useState(false);

  // 세무 검토 폼
  const [taxStatus, setTaxStatus] = useState("passed");
  const [taxNote, setTaxNote] = useState("");
  const [showTaxForm, setShowTaxForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminApi.get<Settlement>(`/settlements/${id}`)
      .then((d) => { setS(d); setApprovedAmount(String(d.requested_amount)); })
      .catch(() => setError("정산 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleTaxReview() {
    if (!id) return;
    setActing(true);
    try {
      const updated = await adminApi.put<Settlement>(`/settlements/${id}/tax-review`, {
        tax_review_status: taxStatus,
        note: taxNote || undefined,
      });
      setS(updated);
      setShowTaxForm(false);
    } catch { setError("세무 검토 처리 중 오류가 발생했습니다."); }
    finally { setActing(false); }
  }

  async function handleApprove() {
    if (!id) return;
    setActing(true);
    try {
      const updated = await adminApi.put<Settlement>(`/settlements/${id}/approve`, {
        approved_amount: Number(approvedAmount),
        payout_scheduled_date: payoutDate || undefined,
      });
      setS(updated);
      setShowApproveForm(false);
    } catch { setError("승인 처리 중 오류가 발생했습니다. (super_admin 권한 필요)"); }
    finally { setActing(false); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={`정산 상세 — ${MILESTONE_LABEL[s?.milestone_type ?? ""] ?? s?.milestone_type ?? ""}`}
        actions={<Button variant="ghost" onClick={() => navigate(-1)}>← 목록</Button>}
      />
      {error && <ErrorAlert message={error} />}

      {s && (
        <div className="p-6 max-w-2xl space-y-4">
          {/* 기본 정보 */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {[
              { label: "협력사 ID", value: s.vendor_id },
              { label: "청구 금액", value: `${s.requested_amount.toLocaleString()}원` },
              { label: "승인 금액", value: s.approved_amount ? `${s.approved_amount.toLocaleString()}원` : "미정" },
              { label: "세무 검토", value: s.tax_review_status },
              { label: "상태", value: s.status },
              { label: "지급 예정일", value: s.payout_scheduled_date ?? "미정" },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-3 flex gap-4">
                <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-300">{value}</span>
              </div>
            ))}
            {s.invoice_file && (
              <div className="px-5 py-3 flex gap-4">
                <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">계산서</span>
                <a href={`http://localhost:8000${s.invoice_file}`} target="_blank" rel="noreferrer"
                  className="text-sm text-blue-400 hover:underline">파일 보기</a>
              </div>
            )}
          </div>

          {/* 법무/세무 주의 알림 */}
          <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl p-4 text-xs text-yellow-300 space-y-1">
            <p className="font-medium">⚠️ 법무/세무 주의</p>
            <p>• 실제 계좌이체는 시스템 외부에서 수동 처리합니다.</p>
            <p>• 세금계산서 발행 여부는 메모 필드로만 기록됩니다.</p>
            <p>• 에스크로 기능은 미구현 상태입니다 (향후 PG사 연동 필요).</p>
          </div>

          {/* 세무 검토 버튼 */}
          {s.status === "requested" && !showTaxForm && (
            <Button onClick={() => setShowTaxForm(true)} variant="ghost">
              세무 검토 처리
            </Button>
          )}
          {showTaxForm && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-300">세무 검토 결과</p>
              <select value={taxStatus} onChange={(e) => setTaxStatus(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">
                <option value="passed">통과</option>
                <option value="failed">반려</option>
              </select>
              <textarea value={taxNote} onChange={(e) => setTaxNote(e.target.value)}
                placeholder="검토 메모 (선택)" rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none" />
              <div className="flex gap-2">
                <Button onClick={handleTaxReview} disabled={acting}>확인</Button>
                <Button variant="ghost" onClick={() => setShowTaxForm(false)}>취소</Button>
              </div>
            </div>
          )}

          {/* 승인 버튼 (super_admin만 가능) */}
          {s.status === "pending_approval" && !showApproveForm && (
            <Button onClick={() => setShowApproveForm(true)}>최고관리자 승인</Button>
          )}
          {showApproveForm && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-300">승인 처리</p>
              <div>
                <label className="text-xs text-gray-500">승인 금액</label>
                <input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
              </div>
              <div>
                <label className="text-xs text-gray-500">지급 예정일</label>
                <input type="date" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={acting}>승인 확정</Button>
                <Button variant="ghost" onClick={() => setShowApproveForm(false)}>취소</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
