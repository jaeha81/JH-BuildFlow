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
  // 자동 업데이트 IPC
  onUpdateAvailable: (cb: (info: unknown) => void) =>
    ipcRenderer.on("updater:update-available", (_e, info) => cb(info)),
  onUpdateDownloaded: (cb: (info: unknown) => void) =>
    ipcRenderer.on("updater:update-downloaded", (_e, info) => cb(info)),
  onDownloadProgress: (cb: (p: unknown) => void) =>
    ipcRenderer.on("updater:download-progress", (_e, p) => cb(p)),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
});
