import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi, settlementsApi, type Project } from "../lib/api";
import { PageHeader, StatusCard, LoadingSpinner, ErrorAlert, Badge } from "../components/ui";
import { useAgentStatus } from "../hooks/useAgentStatus";

const ACCENT_COLORS = [
  { bg: "bg-[#5B8DEF]", border: "border-white/60", text: "text-white" },
  { bg: "bg-[#FFE566]", border: "border-black",     text: "text-black" },
  { bg: "bg-[#FF6B6B]", border: "border-white/60", text: "text-white" },
  { bg: "bg-[#4ADE80]", border: "border-black",     text: "text-black" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingSettlements, setPendingSettlements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const agentState = useAgentStatus();

  useEffect(() => {
    Promise.all([projectsApi.list(), settlementsApi.listPending()])
      .then(([proj, settlements]) => {
        setProjects(proj);
        setPendingSettlements(settlements.length);
      })
      .catch(() => setError("데이터를 불러오지 못했습니다. API 서버 상태를 확인하세요."))
      .finally(() => setLoading(false));
  }, []);

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const agentErrorCount = agentState
    ? Object.values(agentState.agents).filter((a) => a.status === "error").length
    : 0;

  const summaryCards = [
    { title: "진행 중 프로젝트", value: activeProjects, sub: `전체 ${projects.length}개` },
    { title: "승인 대기 정산",   value: pendingSettlements, sub: "요청됨" },
    { title: "에이전트 오류",    value: agentErrorCount, sub: agentState ? `Wave: ${agentState.wave.status}` : "연결 안됨" },
    { title: "전체 프로젝트",    value: projects.length, sub: "누적" },
  ];

  return (
    <div>
      <PageHeader title="대시보드" />
      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="p-6 space-y-6">
          {/* 요약 카드 — 네오브루탈 컬러 그리드 */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map((card, idx) => {
              const c = ACCENT_COLORS[idx % ACCENT_COLORS.length]!;
              return (
                <div
                  key={card.title}
                  className={`${c.bg} ${c.border} ${c.text} border-2 p-5 space-y-1 shadow-[4px_4px_0px_rgba(255,255,255,0.15)]`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide opacity-80">{card.title}</p>
                  <p className="text-3xl font-black">{card.value}</p>
                  {card.sub && <p className="text-xs font-medium opacity-70">{card.sub}</p>}
                </div>
              );
            })}
          </div>

          {/* 에이전트 파이프라인 */}
          {agentState && (
            <div className="bg-[#1A1D27] border-2 border-white/10 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-[#5B8DEF] border border-white" />
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">에이전트 파이프라인</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.values(agentState.agents).map((agent) => {
                  const variantMap: Record<string, "idle" | "info" | "success" | "error" | "warning"> = {
                    idle: "idle", running: "info", done: "success", error: "error",
                  };
                  return (
                    <div key={agent.name} className="flex items-center gap-1.5">
                      <Badge variant={variantMap[agent.status] ?? "default"}>{agent.name}</Badge>
                      <span className="text-xs text-gray-600">{agent.status}</span>
                    </div>
                  );
                })}
              </div>
              {agentState.manualReviewQueue.filter((i) => !i.resolved).length > 0 && (
                <div className="mt-3 px-3 py-2 bg-[#FFE566] border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                  ⚠ 수동 보정 대기: {agentState.manualReviewQueue.filter((i) => !i.resolved).length}건
                </div>
              )}
            </div>
          )}

          {/* 최근 프로젝트 */}
          <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
            <div className="px-5 py-4 border-b-2 border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-wide">최근 프로젝트</h2>
              <button
                onClick={() => navigate("/projects")}
                className="text-xs font-bold text-[#5B8DEF] border-2 border-[#5B8DEF] px-2 py-1
                  hover:bg-[#5B8DEF] hover:text-white transition-colors"
              >
                전체 보기 →
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="py-8 text-center text-sm font-bold text-gray-600">등록된 프로젝트가 없습니다</div>
            ) : (
              <div className="divide-y-2 divide-white/5">
                {projects.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.site_address ?? "주소 미입력"}</p>
                    </div>
                    <Badge variant={p.status === "active" ? "success" : "default"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
