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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-300">Wave 상태</h2>
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
            <p className="text-xs text-gray-500">
              시작: {new Date(state.wave.startedAt).toLocaleTimeString()}
              {state.wave.completedAt &&
                ` → 완료: ${new Date(state.wave.completedAt).toLocaleTimeString()}`}
            </p>
          )}
        </div>

        {/* 에이전트 6개 카드 */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.values(state.agents).map((agent) => (
            <div
              key={agent.name}
              className={`rounded-xl border p-4 space-y-2 ${
                agent.status === "error"
                  ? "border-red-800 bg-red-950/20"
                  : agent.status === "running"
                  ? "border-blue-700 bg-blue-950/20"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{agent.name}</span>
                <Badge variant={STATUS_VARIANT[agent.status] ?? "default"}>
                  {STATUS_LABEL[agent.status] ?? agent.status}
                </Badge>
              </div>

              {agent.currentFile && (
                <p className="text-xs text-gray-500 truncate" title={agent.currentFile}>
                  처리 중: {agent.currentFile}
                </p>
              )}

              {agent.errorMessage && (
                <p className="text-xs text-red-400 line-clamp-2">{agent.errorMessage}</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>처리 완료 {agent.processedCount}건</span>
                {agent.lastRunAt && (
                  <span>{new Date(agent.lastRunAt).toLocaleTimeString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 수동 보정 큐 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">
              수동 보정 큐
              {manualQueue.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-yellow-900 text-yellow-300 text-xs rounded">
                  {manualQueue.length}
                </span>
              )}
            </h2>
          </div>

          {manualQueue.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-600 text-center">
              수동 보정 대기 항목이 없습니다
            </p>
          ) : (
            <div className="divide-y divide-gray-800">
              {manualQueue.map((item) => (
                <div key={item.id} className="px-5 py-3 space-y-1">
                  <p className="text-sm text-white">{item.fileName}</p>
                  <p className="text-xs text-yellow-400">{item.reason}</p>
                  <p className="text-xs text-gray-600">
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
