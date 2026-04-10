import { useEffect, useState } from "react";
import { adminApi } from "../lib/api";
import { Badge } from "./ui";

interface BidRow {
  bid_id: string;
  vendor_id: string;
  company_name: string;
  sent_at: string | null;
  read: boolean;
  response_status: string;
  elapsed_hours: number | null;
  unresponded_warning: boolean;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "info" }> = {
  pending:               { label: "대기 중", variant: "warning" },
  sent:                  { label: "발송됨", variant: "info" },
  read:                  { label: "열람", variant: "info" },
  accepted:              { label: "참여", variant: "success" },
  rejected:              { label: "거절", variant: "error" },
  on_hold:               { label: "보류", variant: "default" },
  expired:               { label: "만료", variant: "error" },
  rebid_pending_confirm: { label: "재발주 대기", variant: "warning" },
  rebid_confirmed:       { label: "재발주 확인", variant: "info" },
  rebid_sent:            { label: "재발주 발송", variant: "info" },
};

export function BidResponseTable({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .get<BidRow[]>(`/bid-management/response-status/${projectId}`)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <p className="text-xs text-gray-500 py-4">로딩 중...</p>;
  }

  if (rows.length === 0) {
    return <p className="text-xs text-gray-500 py-4">발주 내역이 없습니다</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-500">
            <th className="text-left px-3 py-2">업체명</th>
            <th className="text-left px-3 py-2">발송 시각</th>
            <th className="text-center px-3 py-2">열람</th>
            <th className="text-left px-3 py-2">응답 상태</th>
            <th className="text-right px-3 py-2">경과 (h)</th>
            <th className="text-center px-3 py-2">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {rows.map((row) => {
            const st = STATUS_MAP[row.response_status] ?? { label: row.response_status, variant: "default" as const };
            return (
              <tr
                key={row.bid_id}
                className={`hover:bg-gray-800 transition-colors ${row.unresponded_warning ? "bg-red-950/20" : ""}`}
              >
                <td className="px-3 py-2 text-white font-medium">
                  {row.unresponded_warning && (
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2" title="24시간 미응답" />
                  )}
                  {row.company_name}
                </td>
                <td className="px-3 py-2 text-gray-400 text-xs">
                  {row.sent_at ? new Date(row.sent_at).toLocaleString("ko-KR") : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={row.read ? "text-green-400" : "text-gray-600"}>{row.read ? "✓" : "—"}</span>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={st.variant}>{st.label}</Badge>
                </td>
                <td className={`px-3 py-2 text-right text-xs ${row.unresponded_warning ? "text-red-400 font-bold" : "text-gray-400"}`}>
                  {row.elapsed_hours != null ? `${row.elapsed_hours}h` : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  {(row.response_status === "rejected" || row.response_status === "expired") && (
                    <button
                      onClick={() => {
                        // 재발주 요청 — 상위에서 핸들링
                        window.dispatchEvent(new CustomEvent("request-rebid", { detail: row.bid_id }));
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      재발주
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
