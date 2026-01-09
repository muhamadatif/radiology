// main.ts
import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

// 🔥 Handle squirrel events (this prevents Windows installer)
if (require("electron-squirrel-startup")) {
  app.quit();
}

const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
    },
  });

  win.loadURL(
    VITE_DEV_SERVER_URL || `file://${path.join(RENDERER_DIST, "index.html")}`
  );

  if (app.isPackaged) {
    win.removeMenu();
    initializeAutoUpdater();
  }
}

function initializeAutoUpdater() {
  // 🔥 SILENT UPDATE CONFIGURATION
  autoUpdater.autoDownload = false; // User clicks "Download"
  autoUpdater.autoInstallOnAppQuit = true; // Silent install on quit

  autoUpdater.on("checking-for-update", () => {
    win?.webContents.send("update-status", "Checking...");
  });

  autoUpdater.on("update-available", (info) => {
    win?.webContents.send("update-available", info);
  });

  autoUpdater.on("update-not-available", () => {
    win?.webContents.send("update-status", "Up to date");
    setTimeout(() => win?.webContents.send("update-status", ""), 3000);
  });

  autoUpdater.on("download-progress", (progress) => {
    win?.webContents.send("download-progress", {
      percent: Math.floor(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    win?.webContents.send("update-downloaded", info);
  });

  autoUpdater.on("error", (err) => {
    win?.webContents.send("update-error", err.message);
  });

  setTimeout(() => autoUpdater.checkForUpdates(), 3000);
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
}

// IPC Handlers
ipcMain.on("check-for-updates", () => {
  if (app.isPackaged) autoUpdater.checkForUpdates();
});

ipcMain.on("download-update", () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on("install-update", () => {
  // 🔥 SILENT INSTALL - No Windows installer will show
  autoUpdater.quitAndInstall(true, true);
});

ipcMain.handle("get-app-version", () => app.getVersion());

ipcMain.on("skip-update", (_, version) => {
  console.log(`Skipped update ${version}`);
  win?.webContents.send("update-status", `Skipped ${version}`);
  setTimeout(() => win?.webContents.send("update-status", ""), 3000);
});

// App lifecycle
app.on("ready", () => {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) app.quit();

  createWindow();

  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
