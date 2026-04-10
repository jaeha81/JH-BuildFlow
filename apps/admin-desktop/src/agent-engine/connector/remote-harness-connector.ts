/**
 * PROMPT-15: RemoteHarnessConnector — 외부 하네스 서버 연결 stub
 *
 * 향후 WebSocket 또는 HTTP polling 방식으로 외부 하네스 서버와 통신.
 * 현재는 모든 메서드에서 NotImplementedError 발생.
 *
 * 예상 사용 시나리오:
 *   - 멀티 PC 환경에서 중앙 하네스 서버 운영
 *   - 클라우드 기반 파일 처리 서버 연동
 *   - SaaS 모드에서 Electron 없이 웹 클라이언트로 구동
 */

import type {
  AgentError,
  AgentJob,
  AgentResult,
  HarnessConnector,
  HarnessStatus,
  WaveResult,
} from "./harness-connector";

export class RemoteHarnessConnector implements HarnessConnector {
  private readonly serverUrl: string;
  private readonly apiKey: string;
  private completeCallbacks: Array<(result: AgentResult) => void> = [];
  private errorCallbacks: Array<(error: AgentError) => void> = [];

  constructor(serverUrl: string, apiKey: string) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
  }

  async executeWave(_jobs: AgentJob[]): Promise<WaveResult> {
    // TODO: POST {serverUrl}/api/waves { jobs: AgentJob[] }
    // WebSocket 대안: ws://{serverUrl}/harness — 실시간 상태 스트리밍
    throw new Error(
      "RemoteHarnessConnector.executeWave는 아직 구현되지 않았습니다. " +
        `서버 URL: ${this.serverUrl}`
    );
  }

  async getStatus(): Promise<HarnessStatus> {
    // TODO: GET {serverUrl}/api/status
    throw new Error(
      "RemoteHarnessConnector.getStatus는 아직 구현되지 않았습니다."
    );
  }

  onAgentComplete(callback: (result: AgentResult) => void): void {
    // TODO: WebSocket 'agent:complete' 이벤트 구독
    this.completeCallbacks.push(callback);
  }

  onError(callback: (error: AgentError) => void): void {
    // TODO: WebSocket 'agent:error' 이벤트 구독
    this.errorCallbacks.push(callback);
  }
}

/**
 * 환경에 따라 커넥터 선택
 *
 * @example
 * const connector = createHarnessConnector(harness);
 * await connector.executeWave(jobs);
 */
export function createHarnessConnector(
  localHarness?: import("../harness").Harness,
  remoteUrl?: string,
  remoteApiKey?: string
): HarnessConnector {
  if (remoteUrl && remoteApiKey) {
    return new RemoteHarnessConnector(remoteUrl, remoteApiKey);
  }
  if (localHarness) {
    const { LocalHarnessConnector } = require("./local-harness-connector") as typeof import("./local-harness-connector");
    return new LocalHarnessConnector(localHarness);
  }
  throw new Error("LocalHarness 또는 Remote URL 중 하나는 반드시 제공해야 합니다.");
}
