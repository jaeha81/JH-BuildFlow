/**
 * PROMPT-11: 분석 대시보드 (/analytics)
 * 협력사 평가 점수 테이블 + 공종별 상위 + 미응답 경고 + 발주 통계
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../lib/api";
import { PageHeader, Badge, Button, LoadingSpinner, ErrorAlert } from "../components/ui";

interface VendorScore {
  vendor_id: string;
  company_name: string;
  trade_types: string[];
  regions: string[];
  score: number | null;
  participation_rate: number | null;
  response_speed_avg: number | null;
  win_rate: number | null;
  completion_rate: number | null;
  snapshot_date: string | null;
}

interface TopEntry {
  trade_type: string;
  vendors: { vendor_id: string; company_name: string; score: number | null; rating: number | null }[];
}

interface LowResponse {
  vendor_id: string;
  company_name: string;
  unresponded_count: number;
}

interface BidStats {
  total: number;
  by_status: Record<string, number>;
  response_rate: number;
}

function ScoreBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600 text-xs font-bold">—</span>;
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-[#4ADE80]" : pct >= 40 ? "bg-[#FFE566]" : "bg-[#FF6B6B]";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 border border-white/20 bg-white/5">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-black text-white">{pct}</span>
    </div>
  );
}

function pct(v: number | null) {
  return v !== null ? `${Math.round(v * 100)}%` : "—";
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [scores, setScores] = useState<VendorScore[]>([]);
  const [topByTrade, setTopByTrade] = useState<TopEntry[]>([]);
  const [lowResponse, setLowResponse] = useState<LowResponse[]>([]);
  const [bidStats, setBidStats] = useState<BidStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [s, top, low, stats] = await Promise.all([
        adminApi.get<VendorScore[]>(`/analytics/vendor-scores${tradeFilter ? `?trade_type=${encodeURIComponent(tradeFilter)}` : ""}`),
        adminApi.get<TopEntry[]>("/analytics/top-by-trade"),
        adminApi.get<LowResponse[]>("/analytics/low-response"),
        adminApi.get<BidStats>("/analytics/bid-stats"),
      ]);
      setScores(s);
      setTopByTrade(top);
      setLowResponse(low);
      setBidStats(stats);
    } catch {
      setError("분석 데이터를 불러오지 못했습니다. API 서버 상태를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompute() {
    setComputing(true);
    try {
      await adminApi.post("/analytics/compute-snapshots", {});
      await loadAll();
    } catch {
      setError("스냅샷 계산 중 오류가 발생했습니다.");
    } finally {
      setComputing(false);
    }
  }

  useEffect(() => { loadAll(); }, [tradeFilter]);

  // 고유 공종 목록 (필터용)
  const allTrades = Array.from(new Set(scores.flatMap((s) => s.trade_types))).sort();

  return (
    <div>
      <PageHeader
        title="분석 대시보드"
        actions={
          <Button onClick={handleCompute} disabled={computing}>
            {computing ? "계산 중..." : "⟳ 스냅샷 계산"}
          </Button>
        }
      />

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="p-6 space-y-6">

          {/* 발주 현황 요약 */}
          {bidStats && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: "전체 발주", value: bidStats.total, color: "bg-[#5B8DEF] text-white" },
                { label: "수락됨", value: bidStats.by_status["accepted"] ?? 0, color: "bg-[#4ADE80] text-black" },
                { label: "거절/만료", value: (bidStats.by_status["rejected"] ?? 0) + (bidStats.by_status["expired"] ?? 0), color: "bg-[#FF6B6B] text-white" },
                { label: "응답률", value: `${Math.round(bidStats.response_rate * 100)}%`, color: "bg-[#FFE566] text-black" },
              ].map((card) => (
                <div key={card.label} className={`${card.color} border-2 border-black p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]`}>
                  <p className="text-xs font-black uppercase tracking-wide opacity-80">{card.label}</p>
                  <p className="text-3xl font-black mt-1">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* 협력사 평가 점수 테이블 */}
          <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
            <div className="px-5 py-4 border-b-2 border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#5B8DEF] border border-white" />
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">협력사 평가 점수</h2>
              </div>
              {/* 공종 필터 */}
              <div className="flex items-center gap-2">
                <select
                  value={tradeFilter}
                  onChange={(e) => setTradeFilter(e.target.value)}
                  className="bg-[#0F1117] border-2 border-white/20 text-gray-300 text-xs font-bold px-2 py-1 focus:outline-none focus:border-[#5B8DEF]"
                >
                  <option value="">전체 공종</option>
                  {allTrades.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {scores.length === 0 ? (
              <p className="px-5 py-8 text-sm font-bold text-gray-600 text-center">
                협력사 데이터가 없습니다. 스냅샷을 계산해주세요.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-white/10 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-black">업체명</th>
                      <th className="text-left px-4 py-3 font-black">공종</th>
                      <th className="text-left px-4 py-3 font-black">종합 점수</th>
                      <th className="text-right px-4 py-3 font-black">참여율</th>
                      <th className="text-right px-4 py-3 font-black">응답속도</th>
                      <th className="text-right px-4 py-3 font-black">수주율</th>
                      <th className="text-right px-4 py-3 font-black">완료율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-white/5">
                    {scores.map((v) => (
                      <tr
                        key={v.vendor_id}
                        onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                        className="hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-white font-bold">{v.company_name}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {v.trade_types.slice(0, 3).map((t) => (
                              <Badge key={t} variant="info">{t}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ScoreBar value={v.score} />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 font-bold">{pct(v.participation_rate)}</td>
                        <td className="px-4 py-3 text-right text-gray-400 font-medium">
                          {v.response_speed_avg != null ? `${v.response_speed_avg.toFixed(1)}h` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 font-bold">{pct(v.win_rate)}</td>
                        <td className="px-4 py-3 text-right text-gray-300 font-bold">{pct(v.completion_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 공종별 상위 업체 */}
          {topByTrade.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-[#4ADE80] border border-white" />
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">공종별 상위 업체</h2>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {topByTrade.slice(0, 6).map((entry) => (
                  <div key={entry.trade_type} className="bg-[#1A1D27] border-2 border-white/10 p-4 shadow-[3px_3px_0px_rgba(255,255,255,0.05)]">
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="px-2 py-0.5 bg-[#4ADE80] border border-black text-black text-xs font-black">{entry.trade_type}</span>
                    </div>
                    <div className="space-y-1.5">
                      {entry.vendors.slice(0, 3).map((v, i) => (
                        <div key={v.vendor_id} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-black w-4 ${i === 0 ? "text-[#FFE566]" : "text-gray-600"}`}>
                              {i + 1}
                            </span>
                            <span className="text-xs font-bold text-white truncate max-w-[100px]">{v.company_name}</span>
                          </div>
                          <span className="text-xs font-black text-[#5B8DEF]">
                            {v.score != null ? Math.round(v.score * 100) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 미응답 경고 + 발주 비율 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* 미응답 경고 */}
            <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
              <div className="px-5 py-4 border-b-2 border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#FF6B6B] border border-white" />
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">미응답 경고 (최근 30일)</h2>
              </div>
              {lowResponse.length === 0 ? (
                <p className="px-5 py-6 text-sm font-bold text-gray-600 text-center">미응답 업체 없음</p>
              ) : (
                <div className="divide-y-2 divide-white/5">
                  {lowResponse.slice(0, 8).map((v) => (
                    <div
                      key={v.vendor_id}
                      className="px-5 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                    >
                      <span className="text-sm font-bold text-white">{v.company_name}</span>
                      <div className={`px-2 py-0.5 border-2 text-xs font-black ${
                        v.unresponded_count >= 5 ? "bg-[#FF6B6B] border-black text-white" : "bg-[#FFE566] border-black text-black"
                      }`}>
                        {v.unresponded_count}건
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 발주 상태 분포 */}
            {bidStats && (
              <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
                <div className="px-5 py-4 border-b-2 border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FFE566] border border-black" />
                  <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">발주 상태 분포</h2>
                </div>
                <div className="p-5 space-y-3">
                  {Object.entries(bidStats.by_status)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, cnt]) => {
                      const pctVal = bidStats.total ? Math.round((cnt / bidStats.total) * 100) : 0;
                      const barColor = status === "accepted" ? "bg-[#4ADE80]"
                        : status === "rejected" || status === "expired" ? "bg-[#FF6B6B]"
                        : status === "pending" ? "bg-[#FFE566]"
                        : "bg-[#5B8DEF]";
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-gray-400 uppercase">{status}</span>
                            <span className="text-white">{cnt} ({pctVal}%)</span>
                          </div>
                          <div className="w-full h-2 bg-white/5 border border-white/10">
                            <div className={`h-full ${barColor}`} style={{ width: `${pctVal}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
