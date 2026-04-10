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
        {/* 월 네비게이션 */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 border-2 border-white/20 text-gray-400 font-black
              hover:border-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            ‹
          </button>
          <span className="text-white font-black text-base px-3">{year}년 {month}월</span>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 border-2 border-white/20 text-gray-400 font-black
              hover:border-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            ›
          </button>
        </div>

        <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b-2 border-white/10">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-center text-xs font-black text-gray-500 uppercase py-2">{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dateStr = day
                ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : "";
              const dayEntries = dateStr ? (entryMap[dateStr] ?? []) : [];
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() + 1 &&
                year === today.getFullYear();

              return (
                <div
                  key={idx}
                  className={`min-h-[80px] border-b border-r border-white/5 p-1.5 ${!day ? "bg-black/20" : ""}`}
                >
                  {day && (
                    <>
                      <p className={`text-xs font-black mb-1 ${isToday ? "text-[#5B8DEF]" : "text-gray-500"}`}>
                        {isToday ? (
                          <span className="inline-block w-5 h-5 bg-[#5B8DEF] border border-white text-white text-center leading-5">
                            {day}
                          </span>
                        ) : day}
                      </p>
                      <div className="space-y-0.5">
                        {dayEntries.map((e) => (
                          <button
                            key={e.settlement_id}
                            onClick={() => navigate(`/settlements/${e.settlement_id}`)}
                            className="w-full text-left bg-[#5B8DEF]/20 border border-[#5B8DEF]/40 px-1.5 py-0.5
                              hover:bg-[#5B8DEF]/40 transition-colors"
                          >
                            <p className="text-xs text-[#5B8DEF] truncate font-bold">
                              {MILESTONE_LABEL[e.milestone_type] ?? e.milestone_type}
                            </p>
                            <p className="text-xs text-blue-200 font-black">
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
