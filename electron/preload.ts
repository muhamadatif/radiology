// preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electronUpdater", {
  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
  downloadUpdate: () => ipcRenderer.send("download-update"),
  installUpdate: () => ipcRenderer.send("install-update"),
  skipUpdate: (version: string) => ipcRenderer.send("skip-update", version),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  onUpdateStatus: (callback: (status: string) => void) => {
    const handler = (_event: IpcRendererEvent, status: string) =>
      callback(status);
    ipcRenderer.on("update-status", handler);
    return () => ipcRenderer.removeListener("update-status", handler);
  },

  onUpdateAvailable: (callback: (info: any) => void) => {
    const handler = (_event: IpcRendererEvent, info: any) => callback(info);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.removeListener("update-available", handler);
  },

  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_event: IpcRendererEvent, progress: any) =>
      callback(progress);
    ipcRenderer.on("download-progress", handler);
    return () => ipcRenderer.removeListener("download-progress", handler);
  },

  onUpdateDownloaded: (callback: (info: any) => void) => {
    const handler = (_event: IpcRendererEvent, info: any) => callback(info);
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.removeListener("update-downloaded", handler);
  },

  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_event: IpcRendererEvent, error: string) =>
      callback(error);
    ipcRenderer.on("update-error", handler);
    return () => ipcRenderer.removeListener("update-error", handler);
  },
});
