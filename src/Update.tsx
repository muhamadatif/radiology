// src/components/UpdateNotifier.tsx
import React, { useEffect, useState } from "react";

interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

// Define the window interface locally if needed
declare global {
  interface Window {
    electronUpdater?: {
      checkForUpdates: () => void;
      restartAndUpdate: () => void;
      skipUpdate: (version: string) => void;
      onUpdateStatus: (callback: (status: string) => void) => () => void;
      onUpdateAvailable: (callback: (version: string) => void) => () => void;
      onDownloadProgress: (
        callback: (progress: UpdateProgress) => void
      ) => () => void;
      onUpdateDownloaded: (callback: (version: string) => void) => () => void;
      onUpdateError: (callback: (error: string) => void) => () => void;
      removeAllUpdateListeners: () => void;
      getAppVersion: () => Promise<string>;
    };
  }
}

const UpdateNotifier: React.FC = () => {
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [updateVersion, setUpdateVersion] = useState<string>("");
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [showUpdateDialog, setShowUpdateDialog] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Check if we're in Electron
    if (!window.electronUpdater) {
      console.log("Not in Electron environment, update notifier disabled");
      return;
    }

    console.log("Setting up auto-update listeners...");

    // Set up event listeners
    const cleanupStatus = window.electronUpdater.onUpdateStatus(
      (status: string) => {
        console.log("Update status:", status);
        setUpdateStatus(status);
      }
    );

    const cleanupAvailable = window.electronUpdater.onUpdateAvailable(
      (version: string) => {
        console.log("Update available:", version);
        setUpdateVersion(version);
        setUpdateStatus(`Update ${version} available, downloading...`);
        setError("");
      }
    );

    const cleanupProgress = window.electronUpdater.onDownloadProgress(
      (progress: UpdateProgress) => {
        console.log("Download progress:", progress.percent);
        setDownloadProgress(progress.percent);
        setUpdateStatus(`Downloading: ${progress.percent.toFixed(1)}%`);
      }
    );

    const cleanupDownloaded = window.electronUpdater.onUpdateDownloaded(
      (version: string) => {
        console.log("Update downloaded:", version);
        setUpdateVersion(version);
        setUpdateStatus("");
        setShowUpdateDialog(true);
        setDownloadProgress(100);
      }
    );

    const cleanupError = window.electronUpdater.onUpdateError(
      (errorMsg: string) => {
        console.error("Update error:", errorMsg);
        setError(errorMsg);
        setUpdateStatus(`Error: ${errorMsg}`);
      }
    );

    // Cleanup on unmount
    return () => {
      cleanupStatus();
      cleanupAvailable();
      cleanupProgress();
      cleanupDownloaded();
      cleanupError();
    };
  }, []);

  const handleRestart = () => {
    if (window.electronUpdater) {
      window.electronUpdater.restartAndUpdate();
    }
  };

  const handleCheckForUpdates = () => {
    if (window.electronUpdater) {
      setUpdateStatus("Checking for updates...");
      setError("");
      window.electronUpdater.checkForUpdates();
    }
  };

  const handleSkipUpdate = () => {
    setShowUpdateDialog(false);
    setUpdateStatus("");
    setDownloadProgress(0);
    if (window.electronUpdater && updateVersion) {
      window.electronUpdater.skipUpdate(updateVersion);
    }
  };

  const handleDismissError = () => {
    setError("");
    setUpdateStatus("");
  };

  // Don't show anything if no update activity
  if (!updateStatus && !showUpdateDialog && !error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg mb-2">
          <div className="flex items-start">
            <div className="shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Update Failed</p>
              <p className="mt-1 text-sm">{error}</p>
              <button
                onClick={handleDismissError}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Bar */}
      {downloadProgress > 0 && downloadProgress < 100 && (
        <div className="bg-white p-4 rounded-lg shadow-lg mb-2 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {updateStatus}
            </span>
            <span className="text-sm text-gray-500">
              {downloadProgress.toFixed(1)}%
            </span>
          </div>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Update Downloaded Dialog */}
      {showUpdateDialog && (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-green-200">
          <div className="flex items-start mb-3">
            <div className="shrink-0">
              <svg
                className="h-6 w-6 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                Update Ready!
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Version {updateVersion} is ready to install.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleRestart}
              className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Restart & Install
            </button>
            <button
              onClick={handleSkipUpdate}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Status Message */}
      {updateStatus &&
        !showUpdateDialog &&
        downloadProgress === 0 &&
        !error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm">{updateStatus}</span>
              <button
                onClick={() => setUpdateStatus("")}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

      {/* Manual Check Button */}
      <div className="mt-2 text-right">
        <button
          onClick={handleCheckForUpdates}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Check for updates
        </button>
      </div>
    </div>
  );
};

export default UpdateNotifier;
