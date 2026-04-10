import path from "path";

import { app, BrowserWindow } from "electron";

import { Harness } from "../agent-engine/harness";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// 데이터 디렉토리: 개발 시 프로젝트 루트, 배포 시 userData
const dataDir = isDev
  ? path.join(__dirname, "../../../.agent-data")
  : path.join(app.getPath("userData"), "agent-data");

let harness: Harness | null = null;

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
    },
    title: "JH BuildFlow 관리자",
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

  return win;
}

app.whenReady().then(() => {
  // Harness 초기화 및 시작
  harness = new Harness(dataDir);
  harness.start();

  createWindow();

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
