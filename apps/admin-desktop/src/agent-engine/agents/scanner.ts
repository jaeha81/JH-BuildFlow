import crypto from "crypto";
import fs from "fs";
import path from "path";

import chokidar, { FSWatcher } from "chokidar";

import type { FileDetectedPayload } from "../protocols/agent-message";

export type AgentConfig = {
  watchRoot: string;
  ignoredExtensions: string[];
  debounceMs: number;
};

export type ScannerEvent = {
  type: "file-detected";
  payload: FileDetectedPayload;
};

const STANDARD_FOLDERS = [
  "00_프로젝트기본정보",
  "01_도면",
  "02_공내역서_물량",
  "03_공정일정",
  "04_협력사발주자료",
  "05_협력사견적서원본",
  "06_표준화견적데이터",
  "07_현장사진_이슈",
  "08_정산_세무",
  "09_완료보고",
  "99_로그_감사기록",
] as const;

function detectFolderKey(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  for (const folder of STANDARD_FOLDERS) {
    if (normalized.includes(folder)) return folder;
  }
  return "unknown";
}

function computeFileHash(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export class ScannerAgent {
  private watcher: FSWatcher | null = null;
  private config: AgentConfig;
  private onDetect: (event: ScannerEvent) => void;

  constructor(config: AgentConfig, onDetect: (event: ScannerEvent) => void) {
    this.config = config;
    this.onDetect = onDetect;
  }

  start(): void {
    if (this.watcher) return;

    if (!fs.existsSync(this.config.watchRoot)) {
      fs.mkdirSync(this.config.watchRoot, { recursive: true });
    }

    this.watcher = chokidar.watch(this.config.watchRoot, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
      ignored: (filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        return (
          filePath.includes("node_modules") ||
          filePath.includes(".git") ||
          this.config.ignoredExtensions.includes(ext)
        );
      },
    });

    this.watcher.on("add", (filePath: string) => {
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) return;

        const fileHash = computeFileHash(filePath);
        const payload: FileDetectedPayload = {
          filePath,
          fileName: path.basename(filePath),
          fileHash,
          folderKey: detectFolderKey(filePath),
          detectedAt: new Date().toISOString(),
          sizeBytes: stat.size,
        };
        this.onDetect({ type: "file-detected", payload });
      } catch {
        // 파일 읽기 실패 시 무시
      }
    });
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
  }

  updateConfig(newConfig: AgentConfig): void {
    this.stop();
    this.config = newConfig;
    this.start();
  }
}
