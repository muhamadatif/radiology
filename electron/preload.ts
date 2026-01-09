// preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electronUpdater", {
  // Actions
  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
  downloadUpdate: () => ipcRenderer.send("download-update"),
  installUpdate: () => ipcRenderer.send("install-update"),
  skipUpdate: (v: string) => ipcRenderer.send("skip-update", v),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Event listeners
  onUpdateStatus: (callback: (status: string) => void) => {
    const handler = (_: IpcRendererEvent, s: string) => callback(s);
    ipcRenderer.on("update-status", handler);
    return () => ipcRenderer.off("update-status", handler);
  },

  onUpdateAvailable: (callback: (info: any) => void) => {
    const handler = (_: IpcRendererEvent, info: any) => callback(info);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.off("update-available", handler);
  },

  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_: IpcRendererEvent, p: any) => callback(p);
    ipcRenderer.on("download-progress", handler);
    return () => ipcRenderer.off("download-progress", handler);
  },

  onUpdateDownloaded: (callback: (info: any) => void) => {
    const handler = (_: IpcRendererEvent, info: any) => callback(info);
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.off("update-downloaded", handler);
  },

  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_: IpcRendererEvent, e: string) => callback(e);
    ipcRenderer.on("update-error", handler);
    return () => ipcRenderer.off("update-error", handler);
  },
});
