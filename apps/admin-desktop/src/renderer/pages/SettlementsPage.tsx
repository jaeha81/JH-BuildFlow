/**
 * PROMPT-10: 정산 전체 목록 (/settlements)
 *
 * 법무/세무 주의:
 * - 실제 계좌이체는 시스템 외부에서 수동 처리
 * - 세금계산서 발행 여부는 시스템이 추적하지 않음 (메모 필드만)
 * - 에스크로 기능 미구현 (향후 PG사 연동 필요)
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../lib/api";
import { Badge, EmptyState, ErrorAlert, LoadingSpinner, PageHeader } from "../components/ui";

interface Settlement {
  id: string;
  project_id: string;
  vendor_id: string;
  milestone_type: string;
  requested_amount: number;
  approved_amount: number | null;
  status: string;
  tax_review_status: string;
  payout_scheduled_date: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "info" }> = {
  requested:        { label: "청구됨", variant: "warning" },
  pending_approval: { label: "승인 대기", variant: "info" },
  approved:         { label: "승인됨", variant: "success" },
  scheduled:        { label: "지급 예정", variant: "info" },
  completed:        { label: "완료", variant: "success" },
  rejected:         { label: "반려", variant: "error" },
};

const MILESTONE_LABEL: Record<string, string> = {
  advance: "선금",
  interim: "중도금",
  final: "잔금",
};

export function SettlementsPage() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.get<Settlement[]>("/settlements")
      .then(setSettlements)
      .catch(() => setError("정산 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="정산 관리" />
      {error && <ErrorAlert message={error} />}
      {loading ? (
        <LoadingSpinner />
      ) : settlements.length === 0 ? (
        <EmptyState title="정산 내역이 없습니다" description="협력사가 정산을 요청하면 여기에 표시됩니다." />
      ) : (
        <div className="p-6">
          <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-white/10 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-black">협력사</th>
                  <th className="text-left px-4 py-3 font-black">마일스톤</th>
                  <th className="text-right px-4 py-3 font-black">청구금액</th>
                  <th className="text-right px-4 py-3 font-black">승인금액</th>
                  <th className="text-left px-4 py-3 font-black">세무검토</th>
                  <th className="text-left px-4 py-3 font-black">상태</th>
                  <th className="text-left px-4 py-3 font-black">지급예정일</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-white/5">
                {settlements.map((s) => {
                  const st = STATUS_MAP[s.status] ?? { label: s.status, variant: "default" as const };
                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/settlements/${s.id}`)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{s.vendor_id.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-white font-bold">{MILESTONE_LABEL[s.milestone_type] ?? s.milestone_type}</td>
                      <td className="px-4 py-3 text-right text-gray-300 font-bold">
                        {s.requested_amount.toLocaleString("ko-KR")}원
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 font-bold">
                        {s.approved_amount != null ? `${s.approved_amount.toLocaleString("ko-KR")}원` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.tax_review_status === "passed" ? "success" : s.tax_review_status === "failed" ? "error" : "warning"}>
                          {s.tax_review_status === "passed" ? "검토 완료" : s.tax_review_status === "failed" ? "반려" : "대기"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-medium">
                        {s.payout_scheduled_date ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
