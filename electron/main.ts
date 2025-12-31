// main.ts
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

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
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  // Initialize auto-updater only in production
  if (!app.isPackaged) {
    console.log("Running in development mode - auto-updater disabled");
    return;
  }

  initializeAutoUpdater();
}

function initializeAutoUpdater() {
  console.log("Initializing auto-updater...");

  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.fullChangelog = true;

  // Event: Checking for update
  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");
    win?.webContents.send("update-status", "Checking for updates...");
  });

  // Event: Update available
  autoUpdater.on("update-available", (info) => {
    console.log(`Update available: ${info.version}`);
    win?.webContents.send("update-available", info.version);
    win?.webContents.send(
      "update-status",
      `Update ${info.version} available, downloading...`
    );
  });

  // Event: Update not available
  autoUpdater.on("update-not-available", () => {
    console.log("No updates available.");
    win?.webContents.send("update-status", "You're up to date!");
    setTimeout(() => {
      win?.webContents.send("update-status", "");
    }, 3000);
  });

  // Event: Download progress
  autoUpdater.on("download-progress", (progressObj) => {
    const progress = Math.floor(progressObj.percent);
    console.log(`Download progress: ${progress}%`);

    win?.webContents.send("download-progress", {
      percent: progress,
      bytesPerSecond: progressObj.bytesPerSecond,
      total: progressObj.total,
      transferred: progressObj.transferred,
    });
  });

  // Event: Update downloaded
  autoUpdater.on("update-downloaded", (info) => {
    console.log(`Update ${info.version} downloaded successfully.`);
    win?.webContents.send("update-downloaded", info.version);
    win?.webContents.send(
      "update-status",
      `Update ${info.version} ready to install!`
    );

    // Ask user to restart
    dialog
      .showMessageBox(win!, {
        type: "info",
        title: "Update Ready",
        message: `Version ${info.version} has been downloaded. Restart the application to apply the update?`,
        detail: "Any unsaved work will be lost.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  // Event: Error
  autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err.message);
    win?.webContents.send("update-error", err.message);
    win?.webContents.send("update-status", `Update error: ${err.message}`);
  });

  // Check for updates immediately (after 3 seconds)
  setTimeout(() => {
    console.log("Checking for updates on startup...");
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);

  // Check for updates every 4 hours
  setInterval(() => {
    console.log("Periodic update check...");
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

// Set up IPC handlers for update controls
function setupIpcHandlers() {
  // Manual update check
  ipcMain.on("check-for-updates", () => {
    if (!app.isPackaged) {
      win?.webContents.send(
        "update-error",
        "Cannot check for updates in development mode"
      );
      return;
    }

    console.log("Manual update check requested");
    win?.webContents.send("update-status", "Checking for updates...");
    autoUpdater.checkForUpdates();
  });

  // Restart and install update
  ipcMain.on("restart-and-update", () => {
    if (!app.isPackaged) {
      win?.webContents.send(
        "update-error",
        "Cannot install updates in development mode"
      );
      return;
    }

    console.log("Restarting to install update...");
    autoUpdater.quitAndInstall();
  });

  // Get app version
  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });

  // Skip update
  ipcMain.on("skip-update", (event, version) => {
    console.log(`Skipping update to version ${version}`);
    win?.webContents.send("update-status", `Skipped update to ${version}`);
    setTimeout(() => {
      win?.webContents.send("update-status", "");
    }, 3000);
  });
}

// App lifecycle events
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("ready", () => {
  createWindow();
  setupIpcHandlers();

  // Single instance lock
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", () => {
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    });
  }
});
