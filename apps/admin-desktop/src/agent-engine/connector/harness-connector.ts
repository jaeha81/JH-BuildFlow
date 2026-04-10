/**
 * PROMPT-15: HarnessConnector 인터페이스
 *
 * LocalHarnessConnector  — 현재 구현 (Electron main process 내장)
 * RemoteHarnessConnector — 향후 외부 하네스 서버 연결 stub
 */

import type { AgentName, AgentStatus, ParseResultPayload } from "../protocols/agent-message";

// ── 공유 타입 ──────────────────────────────────────────────────────────────────

export interface AgentJob {
  filePath: string;
  fileHash: string;
  fileName: string;
}

export interface AgentResult {
  jobId: string;
  agentName: AgentName;
  status: "success" | "failed" | "manual_review";
  parseResult?: ParseResultPayload;
  errorDetail?: string;
  completedAt: string;
}

export interface AgentError {
  agentName: AgentName;
  message: string;
  stack?: string;
  occurredAt: string;
}

export interface WaveResult {
  waveId: string;
  jobCount: number;
  successCount: number;
  failedCount: number;
  manualReviewCount: number;
  startedAt: string;
  completedAt: string;
}

export interface HarnessStatus {
  waveRunning: boolean;
  agents: Record<AgentName, { status: AgentStatus; currentFile?: string }>;
  pendingCount: number;
  lastWaveId?: string;
  lastWaveStatus?: "running" | "completed" | "failed";
}

// ── 인터페이스 ─────────────────────────────────────────────────────────────────

export interface HarnessConnector {
  /** Wave 실행 — 주어진 job 목록을 순서대로 처리 */
  executeWave(agents: AgentJob[]): Promise<WaveResult>;

  /** 현재 하네스 상태 조회 */
  getStatus(): Promise<HarnessStatus>;

  /** 개별 에이전트 완료 콜백 등록 */
  onAgentComplete(callback: (result: AgentResult) => void): void;

  /** 에이전트 오류 콜백 등록 */
  onError(callback: (error: AgentError) => void): void;
}
