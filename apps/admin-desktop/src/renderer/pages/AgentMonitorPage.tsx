import { useAgentStatus } from "../hooks/useAgentStatus";
import { PageHeader, Badge, Button, EmptyState } from "../components/ui";

const STATUS_VARIANT: Record<string, "idle" | "info" | "success" | "error"> = {
  idle: "idle",
  running: "info",
  done: "success",
  error: "error",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "대기",
  running: "실행 중",
  done: "완료",
  error: "오류",
};

const AGENT_COLORS: Record<string, string> = {
  error:   "border-[#FF6B6B]/60 bg-[#FF6B6B]/10",
  running: "border-[#5B8DEF]/60 bg-[#5B8DEF]/10",
  done:    "border-[#4ADE80]/40 bg-[#4ADE80]/5",
  idle:    "border-white/10 bg-[#1A1D27]",
};

export function AgentMonitorPage() {
  const state = useAgentStatus();

  function handleStartWave() {
    window.electronAPI?.startWave();
  }

  if (!state) {
    return (
      <div>
        <PageHeader title="에이전트 모니터" />
        <EmptyState
          title="Electron 환경에서만 사용 가능합니다"
          description="웹 브라우저에서는 에이전트 IPC를 사용할 수 없습니다."
        />
      </div>
    );
  }

  const manualQueue = state.manualReviewQueue.filter((i) => !i.resolved);

  return (
    <div>
      <PageHeader
        title="에이전트 모니터"
        actions={
          <Button
            onClick={handleStartWave}
            disabled={state.wave.status === "running"}
          >
            {state.wave.status === "running" ? "실행 중..." : "▶ Wave 수동 실행"}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Wave 상태 */}
        <div className="bg-[#1A1D27] border-2 border-white/10 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#5B8DEF] border border-white" />
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Wave 상태</h2>
            </div>
            <Badge
              variant={
                state.wave.status === "running"
                  ? "info"
                  : state.wave.status === "completed"
                  ? "success"
                  : state.wave.status === "failed"
                  ? "error"
                  : "idle"
              }
            >
              {state.wave.status}
            </Badge>
          </div>
          {state.wave.startedAt && (
            <p className="text-xs text-gray-500 font-bold">
              시작: {new Date(state.wave.startedAt).toLocaleTimeString()}
              {state.wave.completedAt &&
                ` → 완료: ${new Date(state.wave.completedAt).toLocaleTimeString()}`}
            </p>
          )}
        </div>

        {/* 에이전트 카드 */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.values(state.agents).map((agent) => {
            const colorClass = AGENT_COLORS[agent.status] ?? AGENT_COLORS.idle;
            return (
              <div
                key={agent.name}
                className={`border-2 p-4 space-y-2 shadow-[3px_3px_0px_rgba(255,255,255,0.05)] ${colorClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{agent.name}</span>
                  <Badge variant={STATUS_VARIANT[agent.status] ?? "default"}>
                    {STATUS_LABEL[agent.status] ?? agent.status}
                  </Badge>
                </div>

                {agent.currentFile && (
                  <p className="text-xs text-gray-500 truncate font-medium" title={agent.currentFile}>
                    처리 중: {agent.currentFile}
                  </p>
                )}

                {agent.errorMessage && (
                  <p className="text-xs text-[#FF6B6B] font-bold line-clamp-2">{agent.errorMessage}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
                  <span>처리 완료 {agent.processedCount}건</span>
                  {agent.lastRunAt && (
                    <span>{new Date(agent.lastRunAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 수동 보정 큐 */}
        <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
          <div className="px-5 py-4 border-b-2 border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black text-white uppercase tracking-widest">수동 보정 큐</h2>
              {manualQueue.length > 0 && (
                <span className="px-2 py-0.5 bg-[#FFE566] border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_#000]">
                  {manualQueue.length}
                </span>
              )}
            </div>
          </div>

          {manualQueue.length === 0 ? (
            <p className="px-5 py-6 text-sm font-bold text-gray-600 text-center">
              수동 보정 대기 항목이 없습니다
            </p>
          ) : (
            <div className="divide-y-2 divide-white/5">
              {manualQueue.map((item) => (
                <div key={item.id} className="px-5 py-3 space-y-1">
                  <p className="text-sm text-white font-bold">{item.fileName}</p>
                  <p className="text-xs text-[#FFE566] font-bold">{item.reason}</p>
                  <p className="text-xs text-gray-600 font-medium">
                    {new Date(item.addedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
