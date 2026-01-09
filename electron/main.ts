// main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========== 🔥 CRITICAL: THIS MUST BE AT THE VERY TOP ==========
// Handle squirrel events BEFORE anything else
if (require('electron-squirrel-startup')) {
  console.log('Squirrel event detected, quitting...');
  app.quit();
}
// ==============================================================

process.env.APP_ROOT = path.join(__dirname, '..');
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL 
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // Only initialize auto-updater in production
  if (app.isPackaged) {
    win.removeMenu();
    initializeAutoUpdater();
  }
}

function initializeAutoUpdater() {
  console.log('Initializing auto-updater...');
  
  // 🔥 KEY SETTINGS FOR SILENT UPDATES
  autoUpdater.autoDownload = false; // User must click download
  autoUpdater.autoInstallOnAppQuit = true; // Install when app closes
  autoUpdater.allowDowngrade = false;
  autoUpdater.fullChangelog = true;

  // ========== WINDOWS-SPECIFIC SILENT SETTINGS ==========
  if (process.platform === 'win32') {
    // This is how electron-updater handles silent installs
    // The key is quitAndInstall(true, true)
    
    // Also configure NSIS for silent updates in electron-builder config
    // Make sure your electron-builder.json has:
    // "nsis": {
    //   "oneClick": false,
    //   "perMachine": true,
    //   "allowToChangeInstallationDirectory": false,
    //   "silent": true
    // }
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
    win?.webContents.send('update-status', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    win?.webContents.send('update-available', info);
    win?.webContents.send('update-status', `Update ${info.version} available`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No update available');
    win?.webContents.send('update-status', 'You\'re up to date!');
    setTimeout(() => win?.webContents.send('update-status', ''), 3000);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.floor(progress.percent)}%`);
    win?.webContents.send('download-progress', {
      percent: Math.floor(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`Update ${info.version} downloaded`);
    win?.webContents.send('update-downloaded', info);
    win?.webContents.send('update-status', `Update ${info.version} ready`);
  });

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err.message);
    win?.webContents.send('update-error', err.message);
  });

  // Check for updates after 5 seconds
  setTimeout(() => {
    console.log('Checking for updates...');
    autoUpdater.checkForUpdates();
  }, 5000);
}

// IPC Handlers
ipcMain.on('check-for-updates', () => {
  if (app.isPackaged) {
    console.log('Manual update check requested');
    win?.webContents.send('update-status', 'Checking...');
    autoUpdater.checkForUpdates();
  }
});

ipcMain.on('download-update', () => {
  console.log('Starting download...');
  win?.webContents.send('update-status', 'Downloading update...');
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  console.log('Installing update silently...');
  // 🔥 THIS IS THE KEY LINE - true, true = silent install, restart after
  autoUpdater.quitAndInstall(true, true);
});

ipcMain.on('skip-update', (_, version) => {
  console.log(`Skipping update ${version}`);
  win?.webContents.send('update-status', `Skipped update ${version}`);
  setTimeout(() => win?.webContents.send('update-status', ''), 3000);
});

ipcMain.handle('get-app-version', () => app.getVersion());

// App lifecycle
app.on('ready', () => {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }
  
  createWindow();
  
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});