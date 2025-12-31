// preload.ts
import { contextBridge, ipcRenderer } from "electron";

// Define callback types
type UpdateStatusCallback = (status: string) => void;
type UpdateAvailableCallback = (version: string) => void;
type DownloadProgressCallback = (progress: any) => void;
type UpdateDownloadedCallback = (version: string) => void;
type UpdateErrorCallback = (error: string) => void;

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(channel: string, listener: (...args: any[]) => void) {
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(channel: string, listener: (...args: any[]) => void) {
    return ipcRenderer.off(channel, listener);
  },
  send(channel: string, ...args: any[]) {
    return ipcRenderer.send(channel, ...args);
  },
  invoke(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
});

// --------- Expose Auto-Updater API ---------
contextBridge.exposeInMainWorld("electronUpdater", {
  // Update control functions
  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
  restartAndUpdate: () => ipcRenderer.send("restart-and-update"),
  skipUpdate: (version: string) => ipcRenderer.send("skip-update", version),

  // Update event listeners
  onUpdateStatus: (callback: UpdateStatusCallback) => {
    const handler = (_: any, status: string) => callback(status);
    ipcRenderer.on("update-status", handler);
    return () => ipcRenderer.off("update-status", handler);
  },

  onUpdateAvailable: (callback: UpdateAvailableCallback) => {
    const handler = (_: any, version: string) => callback(version);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.off("update-available", handler);
  },

  onDownloadProgress: (callback: DownloadProgressCallback) => {
    const handler = (_: any, progress: any) => callback(progress);
    ipcRenderer.on("download-progress", handler);
    return () => ipcRenderer.off("download-progress", handler);
  },

  onUpdateDownloaded: (callback: UpdateDownloadedCallback) => {
    const handler = (_: any, version: string) => callback(version);
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.off("update-downloaded", handler);
  },

  onUpdateError: (callback: UpdateErrorCallback) => {
    const handler = (_: any, error: string) => callback(error);
    ipcRenderer.on("update-error", handler);
    return () => ipcRenderer.off("update-error", handler);
  },

  // Utility function
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Remove all update listeners
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners("update-status");
    ipcRenderer.removeAllListeners("update-available");
    ipcRenderer.removeAllListeners("download-progress");
    ipcRenderer.removeAllListeners("update-downloaded");
    ipcRenderer.removeAllListeners("update-error");
  },
});
