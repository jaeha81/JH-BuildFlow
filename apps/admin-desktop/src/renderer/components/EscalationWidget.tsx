/**
 * PROMPT-09: 관리자 대시보드 "처리 필요 문의" 위젯
 * - 미응답 메시지 수 + escalated 메시지 수
 * - 24시간 이상 미응답 시 빨간색 강조
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../lib/api";

interface EscalationStats {
  escalated_count: number;
  unresponded_24h: number;
  urgent: boolean;
}

export function EscalationWidget() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<EscalationStats | null>(null);

  useEffect(() => {
    adminApi
      .get<EscalationStats>("/threads/escalation-stats")
      .then(setStats)
      .catch(() => {});
    // 30초마다 갱신
    const id = setInterval(() => {
      adminApi.get<EscalationStats>("/threads/escalation-stats").then(setStats).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  if (!stats) return null;

  const urgent = stats.urgent;

  return (
    <button
      onClick={() => navigate("/messages")}
      className={`bg-gray-900 border rounded-xl p-4 text-left transition-colors hover:bg-gray-800 ${
        urgent ? "border-red-500" : "border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${urgent ? "text-red-400" : "text-gray-400"}`}>
          처리 필요 문의
          {urgent && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
        </p>
      </div>
      <p className={`text-2xl font-bold mt-1 ${urgent ? "text-red-400" : "text-white"}`}>
        {stats.escalated_count}
      </p>
      {stats.unresponded_24h > 0 && (
        <p className="text-xs text-red-400 mt-0.5">
          24h+ 미응답: {stats.unresponded_24h}건
        </p>
      )}
    </button>
  );
}
