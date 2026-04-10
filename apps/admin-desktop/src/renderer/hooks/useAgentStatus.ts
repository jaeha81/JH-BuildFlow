import { useEffect, useState } from "react";
import type { HarnessStateData } from "../../agent-engine/state/harness-state";

// Electron preload에서 노출된 electronAPI를 통해 IPC 통신
declare global {
  interface Window {
    electronAPI?: {
      getAgentStatus: () => Promise<HarnessStateData>;
      onStatusUpdate: (cb: (state: HarnessStateData) => void) => void;
      onFileDetected: (cb: (file: unknown) => void) => void;
      onParseComplete: (cb: (result: unknown) => void) => void;
      onManualReview: (cb: (item: unknown) => void) => void;
      startWave: () => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export function useAgentStatus(): HarnessStateData | null {
  const [state, setState] = useState<HarnessStateData | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    // 초기 상태 조회
    window.electronAPI.getAgentStatus().then(setState).catch(() => {});

    // 실시간 업데이트 구독
    window.electronAPI.onStatusUpdate((newState) => {
      setState(newState);
    });

    return () => {
      window.electronAPI?.removeAllListeners("agent:status-update");
    };
  }, []);

  return state;
}
