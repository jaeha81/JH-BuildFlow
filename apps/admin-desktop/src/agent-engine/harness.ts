import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

import { BrowserWindow, ipcMain } from "electron";

import { classify } from "./agents/classifier";
import { estimate, isEstimateFile } from "./agents/estimator";
import { pack } from "./agents/packager";
import { generateQuoteComparisonReport } from "./agents/reporter";
import { ScannerAgent } from "./agents/scanner";
import { validate } from "./agents/validator";
import type { FileDetectedPayload, ParseResultPayload, ValidationResultPayload } from "./protocols/agent-message";
import { IPC_CHANNELS } from "./protocols/agent-message";
import { HarnessStateStore, type ManualReviewItem } from "./state/harness-state";

export type AgentConfig = {
  watchRoot: string;
  outputDir: string;
  reportsDir: string;
  ignoredExtensions: string[];
  debounceMs: number;
};

const DEFAULT_CONFIG: AgentConfig = {
  watchRoot: path.join(process.env.USERPROFILE ?? "C:/Users/user", "JH-BuildFlow-Watch"),
  outputDir: path.join(process.env.USERPROFILE ?? "C:/Users/user", "JH-BuildFlow-Packages"),
  reportsDir: path.join(process.env.USERPROFILE ?? "C:/Users/user", "JH-BuildFlow-Reports"),
  ignoredExtensions: [".tmp", ".lock", ".lnk", ".db"],
  debounceMs: 500,
};

function loadConfig(configPath: string): AgentConfig {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // 설정 파일 오류 시 기본값 사용
  }
  return DEFAULT_CONFIG;
}

export class Harness {
  private config: AgentConfig;
  private configPath: string;
  private stateStore: HarnessStateStore;
  private scanner: ScannerAgent;
  private pendingFiles: FileDetectedPayload[] = [];
  private waveRunning = false;

  constructor(dataDir: string) {
    this.configPath = path.join(dataDir, "agent-config.json");
    this.config = loadConfig(this.configPath);

    // 기본 설정 파일 없으면 생성
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
    }

    this.stateStore = new HarnessStateStore(dataDir);

    this.scanner = new ScannerAgent(
      {
        watchRoot: this.config.watchRoot,
        ignoredExtensions: this.config.ignoredExtensions,
        debounceMs: this.config.debounceMs,
      },
      (event) => {
        if (event.type === "file-detected") {
          this.onFileDetected(event.payload);
        }
      }
    );
  }

  start(): void {
    this.registerIpcHandlers();
    this.scanner.start();
    this.stateStore.updateAgentStatus("SCANNER", "idle");
  }

  stop(): void {
    this.scanner.stop();
  }

  private onFileDetected(payload: FileDetectedPayload): void {
    // 중복 감지 방지
    if (this.stateStore.isHashProcessed(payload.fileHash)) return;

    this.stateStore.updateAgentStatus("SCANNER", "running", {
      currentFile: payload.fileName,
    });

    this.pendingFiles.push(payload);
    this.broadcastToRenderer(IPC_CHANNELS.FILE_DETECTED, payload);
    this.stateStore.updateAgentStatus("SCANNER", "done");
    this.broadcastStatus();

    // 견적 파일이면 즉시 ESTIMATOR 파이프라인 트리거
    if (isEstimateFile(payload.filePath)) {
      this.runEstimatePipeline(payload).catch((err) => {
        this.stateStore.updateAgentStatus("ESTIMATOR", "error", {
          errorMessage: String(err),
        });
        this.broadcastStatus();
      });
    }
  }

  private async runEstimatePipeline(file: FileDetectedPayload): Promise<void> {
    if (this.waveRunning) return;
    this.waveRunning = true;

    const waveId = randomUUID();
    this.stateStore.updateWave({ waveId, startedAt: new Date().toISOString(), status: "running" });

    try {
      // CLASSIFIER
      this.stateStore.updateAgentStatus("CLASSIFIER", "running", { currentFile: file.fileName });
      const classified = classify(file);
      this.stateStore.updateAgentStatus("CLASSIFIER", "done");
      this.broadcastStatus();

      // PACKAGER
      this.stateStore.updateAgentStatus("PACKAGER", "running", { currentFile: file.fileName });
      pack([classified], { outputDir: this.config.outputDir });
      this.stateStore.updateAgentStatus("PACKAGER", "done");
      this.broadcastStatus();

      // ESTIMATOR
      this.stateStore.updateAgentStatus("ESTIMATOR", "running", { currentFile: file.fileName });
      const parseResult = await estimate(file.filePath);
      parseResult.fileHash = file.fileHash;
      this.stateStore.updateAgentStatus("ESTIMATOR", "done");
      this.broadcastToRenderer(IPC_CHANNELS.PARSE_COMPLETE, parseResult);
      this.broadcastStatus();

      // VALIDATOR
      this.stateStore.updateAgentStatus("VALIDATOR", "running", { currentFile: file.fileName });
      const validationResult = validate(parseResult);
      this.stateStore.updateAgentStatus("VALIDATOR", "done");
      this.broadcastStatus();

      if (validationResult.manualReviewRequired) {
        const reviewItem: ManualReviewItem = {
          id: randomUUID(),
          filePath: file.filePath,
          fileName: file.fileName,
          reason: validationResult.issues.join("; ") || "수동 검토 필요",
          addedAt: new Date().toISOString(),
          resolved: false,
        };
        this.stateStore.addManualReviewItem(reviewItem);
        this.broadcastToRenderer(IPC_CHANNELS.MANUAL_REVIEW, reviewItem);
      }

      // REPORTER
      this.stateStore.updateAgentStatus("REPORTER", "running", { currentFile: file.fileName });
      generateQuoteComparisonReport([validationResult], { reportsDir: this.config.reportsDir });
      this.stateStore.updateAgentStatus("REPORTER", "done");
      this.broadcastStatus();

      // 처리 완료 해시 등록
      this.stateStore.addProcessedHash(file.fileHash);
      this.stateStore.updateWave({ status: "completed", completedAt: new Date().toISOString() });
    } catch (err) {
      this.stateStore.updateWave({ status: "failed" });
      throw err;
    } finally {
      this.waveRunning = false;
      this.broadcastStatus();
    }
  }

  private registerIpcHandlers(): void {
    ipcMain.on(IPC_CHANNELS.START_WAVE, () => {
      if (this.pendingFiles.length > 0) {
        const file = this.pendingFiles.shift()!;
        this.runEstimatePipeline(file).catch(console.error);
      }
    });

    ipcMain.handle(IPC_CHANNELS.GET_STATUS, () => {
      return this.stateStore.getState();
    });
  }

  private broadcastStatus(): void {
    this.broadcastToRenderer(IPC_CHANNELS.STATUS_UPDATE, this.stateStore.getState());
  }

  private broadcastToRenderer(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    }
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getStatus(): import("./connector/harness-connector").HarnessStatus {
    const state = this.stateStore.getState();
    return {
      waveRunning: this.waveRunning,
      agents: Object.fromEntries(
        Object.entries(state.agents).map(([name, a]) => [
          name,
          { status: a.status, currentFile: a.currentFile ?? undefined },
        ])
      ) as import("./connector/harness-connector").HarnessStatus["agents"],
      pendingCount: this.pendingFiles.length,
      ...(state.wave.waveId ? { lastWaveId: state.wave.waveId } : {}),
      ...(state.wave.status !== "idle" ? { lastWaveStatus: state.wave.status as "running" | "completed" | "failed" } : {}),
    };
  }

  reloadConfig(): void {
    this.config = loadConfig(this.configPath);
    this.scanner.updateConfig({
      watchRoot: this.config.watchRoot,
      ignoredExtensions: this.config.ignoredExtensions,
      debounceMs: this.config.debounceMs,
    });
  }
}
