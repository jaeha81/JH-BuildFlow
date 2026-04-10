import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi, settlementsApi, vendorsApi, type Project } from "../lib/api";
import { PageHeader, StatusCard, LoadingSpinner, ErrorAlert, Badge } from "../components/ui";
import { useAgentStatus } from "../hooks/useAgentStatus";

export function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingSettlements, setPendingSettlements] = useState(0);
  const [noResponseVendors, setNoResponseVendors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const agentState = useAgentStatus();

  useEffect(() => {
    async function load() {
      try {
        const [proj, settlements] = await Promise.all([
          projectsApi.list(),
          settlementsApi.listPending(),
        ]);
        setProjects(proj);
        setPendingSettlements(settlements.length);
      } catch {
        setError("데이터를 불러오지 못했습니다. API 서버 상태를 확인하세요.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeProjects = projects.filter((p) => p.status === "active").length;

  const agentErrorCount = agentState
    ? Object.values(agentState.agents).filter((a) => a.status === "error").length
    : 0;

  return (
    <div>
      <PageHeader title="대시보드" />

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="p-6 space-y-6">
          {/* 요약 위젯 */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatusCard
              title="진행 중 프로젝트"
              value={activeProjects}
              sub={`전체 ${projects.length}개`}
              accent
            />
            <StatusCard
              title="승인 대기 정산"
              value={pendingSettlements}
              sub="요청됨"
            />
            <StatusCard
              title="미응답 업체"
              value={noResponseVendors}
              sub="24시간 초과"
            />
            <StatusCard
              title="에이전트 오류"
              value={agentErrorCount}
              sub={agentState ? `Wave: ${agentState.wave.status}` : "연결 안됨"}
            />
          </div>

          {/* 에이전트 상태 요약 */}
          {agentState && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-medium text-gray-400 mb-3">에이전트 파이프라인</h2>
              <div className="flex flex-wrap gap-2">
                {Object.values(agentState.agents).map((agent) => {
                  const variantMap: Record<string, "idle" | "info" | "success" | "error" | "warning"> = {
                    idle: "idle",
                    running: "info",
                    done: "success",
                    error: "error",
                  };
                  return (
                    <div key={agent.name} className="flex items-center gap-1.5">
                      <Badge variant={variantMap[agent.status] ?? "default"}>
                        {agent.name}
                      </Badge>
                      <span className="text-xs text-gray-600">{agent.status}</span>
                    </div>
                  );
                })}
              </div>
              {agentState.manualReviewQueue.filter((i) => !i.resolved).length > 0 && (
                <p className="text-xs text-yellow-400 mt-3">
                  ⚠ 수동 보정 대기:{" "}
                  {agentState.manualReviewQueue.filter((i) => !i.resolved).length}건
                </p>
              )}
            </div>
          )}

          {/* 최근 프로젝트 */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-medium text-white">최근 프로젝트</h2>
              <button
                onClick={() => navigate("/projects")}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                전체 보기
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-600">
                등록된 프로젝트가 없습니다
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {projects.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm text-white">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.site_address ?? "주소 미입력"}</p>
                    </div>
                    <Badge variant={p.status === "active" ? "success" : "default"}>
                      {p.status}
                    </Badge>
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
