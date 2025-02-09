import { useCallback } from "react";

export const Recording = ({
  isRecording,
  recordingTime,
  startRecording,
  stopRecording,
  isAdmin,
}) => {
  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="flex items-center space-x-2">
      {isRecording ? (
        <>
          <div className="flex items-center space-x-2 bg-red-100 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-red-600 font-medium">
              Recording: {formatTime(recordingTime)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="px-3 py-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Stop Recording
          </button>
        </>
      ) : (
        <button
          onClick={startRecording}
          className="px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center space-x-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <circle cx="10" cy="10" r="6" />
          </svg>
          <span>Start Recording</span>
        </button>
      )}
    </div>
  );
};
