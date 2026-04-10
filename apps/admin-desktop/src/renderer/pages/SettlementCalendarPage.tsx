/**
 * PROMPT-10: 월별 지급 예정 캘린더 (/settlements/calendar)
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../lib/api";
import { ErrorAlert, PageHeader } from "../components/ui";

interface CalendarEntry {
  date: string;
  settlement_id: string;
  vendor_id: string;
  approved_amount: number | null;
  milestone_type: string;
  status: string;
}

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const MILESTONE_LABEL: Record<string, string> = { advance: "선금", interim: "중도금", final: "잔금" };

export function SettlementCalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.get<CalendarEntry[]>(`/settlements/calendar?year=${year}&month=${month}`)
      .then(setEntries)
      .catch(() => setError("캘린더 데이터를 불러오지 못했습니다."));
  }, [year, month]);

  const entryMap: Record<string, CalendarEntry[]> = {};
  for (const e of entries) {
    entryMap[e.date] = [...(entryMap[e.date] ?? []), e];
  }

  // 달력 계산
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  return (
    <div>
      <PageHeader title="지급 예정 캘린더" />
      {error && <ErrorAlert message={error} />}

      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-200 px-2">‹</button>
          <span className="text-white font-semibold">{year}년 {month}월</span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-200 px-2">›</button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dateStr = day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const dayEntries = dateStr ? (entryMap[dateStr] ?? []) : [];
              const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

              return (
                <div
                  key={idx}
                  className={`min-h-[80px] border-b border-r border-gray-800 p-1.5 ${!day ? "bg-gray-950/30" : ""}`}
                >
                  {day && (
                    <>
                      <p className={`text-xs font-medium mb-1 ${isToday ? "text-blue-400" : "text-gray-400"}`}>
                        {day}
                      </p>
                      <div className="space-y-0.5">
                        {dayEntries.map((e) => (
                          <button
                            key={e.settlement_id}
                            onClick={() => navigate(`/settlements/${e.settlement_id}`)}
                            className="w-full text-left bg-blue-900/50 border border-blue-800/40 rounded px-1.5 py-0.5 hover:bg-blue-800/60 transition-colors"
                          >
                            <p className="text-xs text-blue-300 truncate">
                              {MILESTONE_LABEL[e.milestone_type] ?? e.milestone_type}
                            </p>
                            <p className="text-xs text-blue-200 font-medium">
                              {e.approved_amount ? `${(e.approved_amount / 10000).toFixed(0)}만원` : "—"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
