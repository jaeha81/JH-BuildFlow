import path from "path";

import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

import { Harness } from "../agent-engine/harness";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// 데이터 디렉토리: 개발 시 프로젝트 루트, 배포 시 userData
const dataDir = isDev
  ? path.join(__dirname, "../../../.agent-data")
  : path.join(app.getPath("userData"), "agent-data");

let harness: Harness | null = null;
let mainWindow: BrowserWindow | null = null;

// ── 자동 업데이트 설정 ──────────────────────────────────
function setupAutoUpdater(): void {
  // 업데이트 서버 없으면 조용히 실패
  const updateUrl = process.env.UPDATE_SERVER_URL;
  if (!updateUrl) return;

  autoUpdater.setFeedURL({ provider: "generic", url: updateUrl });
  autoUpdater.autoDownload = false;  // 수동 확인 후 다운로드

  autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("updater:update-available", info);
  });

  autoUpdater.on("update-not-available", () => {
    // 조용히 무시
  });

  autoUpdater.on("error", (_err) => {
    // 업데이트 오류는 앱 실행에 영향 없음 (조용히 실패)
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow?.webContents.send("updater:download-progress", progress);
  });

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow?.webContents.send("updater:update-downloaded", info);
  });

  // 앱 시작 후 5초 뒤 업데이트 확인
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);
}

// IPC: 렌더러에서 업데이트 설치 요청
ipcMain.handle("updater:install", () => {
  autoUpdater.quitAndInstall();
});

// ── 윈도우 생성 ─────────────────────────────────────────
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // 원격 URL 로드 방지 (패키징 후)
      webSecurity: true,
    },
    title: process.env.APP_PRODUCT_NAME || "JH BuildFlow 관리자",
    show: false,
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  win.once("ready-to-show", () => {
    win.show();
  });

  mainWindow = win;
  return win;
}

// ── 앱 초기화 ────────────────────────────────────────────
app.whenReady().then(() => {
  harness = new Harness(dataDir);
  harness.start();

  createWindow();
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  harness?.stop();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
