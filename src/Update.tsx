// UpdateNotifier.tsx
import { useEffect, useState } from "react";

declare global {
  interface Window {
    electronUpdater?: {
      checkForUpdates: () => void;
      downloadUpdate: () => void;
      installUpdate: () => void;
      onUpdateStatus: (cb: (s: string) => void) => () => void;
      onUpdateAvailable: (cb: (info: any) => void) => () => void;
      onDownloadProgress: (cb: (p: any) => void) => () => void;
      onUpdateDownloaded: (cb: (info: any) => void) => () => void;
      onUpdateError: (cb: (e: string) => void) => () => void;
    };
  }
}

export default function UpdateNotifier() {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.electronUpdater) return;

    const cleanup = [
      window.electronUpdater.onUpdateStatus(setStatus),
      window.electronUpdater.onUpdateAvailable((info) => {
        setUpdateInfo(info);
        setStatus(`Update ${info.version} available`);
        // User must click to download
      }),
      window.electronUpdater.onDownloadProgress((p) => {
        setProgress(p.percent);
        setStatus(`Downloading ${p.percent.toFixed(0)}%`);
      }),
      window.electronUpdater.onUpdateDownloaded((info) => {
        setUpdateInfo(info);
        setProgress(100);
        setShowDialog(true);
      }),
      window.electronUpdater.onUpdateError(setError),
    ];

    return () => cleanup.forEach((c) => c());
  }, []);

  if (!window.electronUpdater || (!status && !showDialog && !error)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError("")} className="text-red-500">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Download Progress */}
      {progress > 0 && progress < 100 && (
        <div className="bg-white border rounded-lg p-3 shadow">
          <div className="flex justify-between mb-1">
            <span className="text-sm">{status}</span>
            <span className="text-sm">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Update Available (Download Prompt) */}
      {updateInfo && !showDialog && progress === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">
                Update {updateInfo.version} available
              </p>
              <p className="text-sm text-gray-600 mt-1">Download now?</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => {
                  window.electronUpdater?.downloadUpdate();
                  setUpdateInfo(null);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Download
              </button>
              <button
                onClick={() => setUpdateInfo(null)}
                className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Downloaded Dialog */}
      {showDialog && (
        <div className="bg-white border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center mb-3">
            <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <p className="font-medium">Update Ready!</p>
              <p className="text-sm text-gray-600">
                Version {updateInfo?.version}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.electronUpdater?.installUpdate()}
              className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Restart & Install
            </button>
            <button
              onClick={() => {
                setShowDialog(false);
                setStatus("");
                setProgress(0);
              }}
              className="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Status Message */}
      {status && !updateInfo && !showDialog && !error && (
        <div className="bg-white border rounded-lg p-2 px-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">{status}</span>
            <button onClick={() => setStatus("")} className="text-gray-500">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
