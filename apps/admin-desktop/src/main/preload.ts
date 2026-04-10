import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Agent IPC channels
  startWave: () => ipcRenderer.send("agent:start-wave"),
  getAgentStatus: () => ipcRenderer.invoke("agent:get-status"),
  onStatusUpdate: (callback: (status: unknown) => void) => {
    ipcRenderer.on("agent:status-update", (_event, status) => callback(status));
  },
  onFileDetected: (callback: (file: unknown) => void) => {
    ipcRenderer.on("agent:file-detected", (_event, file) => callback(file));
  },
  onParseComplete: (callback: (result: unknown) => void) => {
    ipcRenderer.on("agent:parse-complete", (_event, result) =>
      callback(result)
    );
  },
  onManualReview: (callback: (item: unknown) => void) => {
    ipcRenderer.on("agent:manual-review", (_event, item) => callback(item));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
