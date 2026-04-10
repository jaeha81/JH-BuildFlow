import fs from "fs";
import path from "path";

import type { AgentName, AgentStatus } from "../protocols/agent-message";

export type AgentState = {
  name: AgentName;
  status: AgentStatus;
  lastRunAt: string | null;
  errorMessage: string | null;
  processedCount: number;
  currentFile: string | null;
};

export type WaveState = {
  waveId: string;
  startedAt: string | null;
  completedAt: string | null;
  status: "idle" | "running" | "completed" | "failed";
  triggeredBy: "auto" | "manual";
};

export type HarnessStateData = {
  version: number;
  lastUpdated: string;
  wave: WaveState;
  agents: Record<AgentName, AgentState>;
  manualReviewQueue: ManualReviewItem[];
  processedHashes: string[];
};

export type ManualReviewItem = {
  id: string;
  filePath: string;
  fileName: string;
  reason: string;
  addedAt: string;
  resolved: boolean;
};

const AGENT_NAMES: AgentName[] = [
  "SCANNER",
  "CLASSIFIER",
  "PACKAGER",
  "ESTIMATOR",
  "VALIDATOR",
  "REPORTER",
];

function createInitialState(): HarnessStateData {
  const agents = {} as Record<AgentName, AgentState>;
  for (const name of AGENT_NAMES) {
    agents[name] = {
      name,
      status: "idle",
      lastRunAt: null,
      errorMessage: null,
      processedCount: 0,
      currentFile: null,
    };
  }
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    wave: {
      waveId: "",
      startedAt: null,
      completedAt: null,
      status: "idle",
      triggeredBy: "auto",
    },
    agents,
    manualReviewQueue: [],
    processedHashes: [],
  };
}

export class HarnessStateStore {
  private statePath: string;
  private state: HarnessStateData;

  constructor(dataDir: string) {
    this.statePath = path.join(dataDir, "harness-state.json");
    this.state = this.load();
  }

  private load(): HarnessStateData {
    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, "utf-8");
        return JSON.parse(raw) as HarnessStateData;
      }
    } catch {
      // 상태 파일 손상 시 초기화
    }
    return createInitialState();
  }

  private save(): void {
    this.state.lastUpdated = new Date().toISOString();
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), "utf-8");
  }

  getState(): HarnessStateData {
    return structuredClone(this.state);
  }

  updateAgentStatus(
    name: AgentName,
    status: AgentStatus,
    extra: Partial<AgentState> = {}
  ): void {
    this.state.agents[name] = {
      ...this.state.agents[name],
      status,
      ...extra,
      ...(status === "running" ? { errorMessage: null } : {}),
      ...(status === "done" || status === "error"
        ? { currentFile: null, lastRunAt: new Date().toISOString() }
        : {}),
    };
    this.save();
  }

  updateWave(wave: Partial<WaveState>): void {
    this.state.wave = { ...this.state.wave, ...wave };
    this.save();
  }

  addManualReviewItem(item: ManualReviewItem): void {
    this.state.manualReviewQueue.push(item);
    this.save();
  }

  isHashProcessed(hash: string): boolean {
    return this.state.processedHashes.includes(hash);
  }

  addProcessedHash(hash: string): void {
    if (!this.state.processedHashes.includes(hash)) {
      this.state.processedHashes.push(hash);
      // 최대 10000개 유지
      if (this.state.processedHashes.length > 10000) {
        this.state.processedHashes = this.state.processedHashes.slice(-10000);
      }
      this.save();
    }
  }

  getManualReviewQueue(): ManualReviewItem[] {
    return this.state.manualReviewQueue.filter((i) => !i.resolved);
  }
}
