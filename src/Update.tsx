// src/components/UpdateNotifier.tsx
import { useEffect, useState } from "react";

declare global {
  interface Window {
    electronUpdater?: {
      checkForUpdates: () => void;
      downloadUpdate: () => void;
      installUpdate: () => void;
      skipUpdate: (version: string) => void;
      onUpdateStatus: (cb: (s: string) => void) => () => void;
      onUpdateAvailable: (cb: (i: any) => void) => () => void;
      onDownloadProgress: (cb: (p: any) => void) => () => void;
      onUpdateDownloaded: (cb: (i: any) => void) => () => void;
      onUpdateError: (cb: (e: string) => void) => () => void;
    };
  }
}

const UpdateNotifier = () => {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.electronUpdater) {
      console.log("Not in Electron environment");
      return;
    }

    const cleanupStatus = window.electronUpdater.onUpdateStatus((s) => {
      console.log("Update status:", s);
      setStatus(s);
    });

    const cleanupAvailable = window.electronUpdater.onUpdateAvailable(
      (info) => {
        console.log("Update available:", info);
        setUpdateInfo(info);
        setStatus(`Update ${info.version} available`);
        setError("");
      }
    );

    const cleanupProgress = window.electronUpdater.onDownloadProgress((p) => {
      console.log("Download progress:", p.percent);
      setProgress(p.percent);
      setStatus(`Downloading ${p.percent}%`);
    });

    const cleanupDownloaded = window.electronUpdater.onUpdateDownloaded(
      (info) => {
        console.log("Update downloaded:", info);
        setUpdateInfo(info);
        setProgress(100);
        setShowInstall(true);
        setStatus("");
      }
    );

    const cleanupError = window.electronUpdater.onUpdateError((err) => {
      console.error("Update error:", err);
      setError(err);
      setStatus(`Error: ${err}`);
    });

    return () => {
      cleanupStatus();
      cleanupAvailable();
      cleanupProgress();
      cleanupDownloaded();
      cleanupError();
    };
  }, []);

  const handleCheckUpdates = () => {
    if (window.electronUpdater) {
      window.electronUpdater.checkForUpdates();
    }
  };

  if (!window.electronUpdater) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-red-700 text-sm">{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Update Available Prompt */}
      {updateInfo && !showInstall && progress === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow">
          <p className="font-medium text-blue-800 mb-2">
            Update {updateInfo.version} Available
          </p>
          <p className="text-sm text-blue-600 mb-3">
            {updateInfo.releaseName ||
              "A new version is available for download"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.electronUpdater?.downloadUpdate()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Download Update
            </button>
            <button
              onClick={() => {
                setUpdateInfo(null);
                setStatus("");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      )}

      {/* Download Progress */}
      {progress > 0 && progress < 100 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-gray-700">
              Downloading Update
            </span>
            <span className="text-gray-600">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{status}</p>
        </div>
      )}

      {/* Ready to Install */}
      {showInstall && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">✓</span>
            </div>
            <div>
              <p className="font-medium text-green-800">
                Update Ready to Install!
              </p>
              <p className="text-sm text-green-600">
                Version {updateInfo?.version} has been downloaded
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => window.electronUpdater?.installUpdate()}
              className="flex-1 py-2.5 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition"
            >
              Restart & Install Now
            </button>
            <button
              onClick={() => {
                setShowInstall(false);
                window.electronUpdater?.skipUpdate(updateInfo?.version || "");
              }}
              className="flex-1 py-2.5 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition"
            >
              Install Later
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3 text-center">
            The update will install automatically when you close the app
          </p>
        </div>
      )}

      {/* Status Message (when no other UI is shown) */}
      {status && !updateInfo && !showInstall && progress === 0 && !error && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">{status}</span>
            <button
              onClick={() => setStatus("")}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Manual Check Button (only shown when no update activity) */}
      {!status && !updateInfo && !showInstall && progress === 0 && !error && (
        <div className="text-right">
          <button
            onClick={handleCheckUpdates}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Check for Updates
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateNotifier; // 🔥 Make sure this line exists!
