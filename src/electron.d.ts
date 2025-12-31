// src/electron.d.ts
interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

// Define specific function types
type UpdateStatusCallback = (status: string) => void;
type UpdateAvailableCallback = (version: string) => void;
type DownloadProgressCallback = (progress: UpdateProgress) => void;
type UpdateDownloadedCallback = (version: string) => void;
type UpdateErrorCallback = (error: string) => void;

// IPC Renderer interface
interface IpcRenderer {
  on: (channel: string, listener: (...args: any[]) => void) => void;
  off: (channel: string, listener: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

// Electron Updater API interface
interface ElectronUpdaterAPI {
  checkForUpdates: () => void;
  restartAndUpdate: () => void;
  skipUpdate: (version: string) => void;
  onUpdateStatus: (callback: UpdateStatusCallback) => () => void;
  onUpdateAvailable: (callback: UpdateAvailableCallback) => () => void;
  onDownloadProgress: (callback: DownloadProgressCallback) => () => void;
  onUpdateDownloaded: (callback: UpdateDownloadedCallback) => () => void;
  onUpdateError: (callback: UpdateErrorCallback) => () => void;
  removeAllUpdateListeners: () => void;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronUpdater?: ElectronUpdaterAPI;
    ipcRenderer?: IpcRenderer;
  }
}

export {};
