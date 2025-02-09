import { memo } from "react";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/solid";
import { ArrowsPointingInIcon } from "@heroicons/react/24/solid";

export const ScreenShareButton = memo(
  ({ isScreenSharing, onStartScreenShare, onStopScreenShare }) => {
    return (
      <button
        onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
        className={`p-3 rounded-full ${
          isScreenSharing
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600"
        } transition-colors`}
        title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
      >
        {isScreenSharing ? (
          <ArrowsPointingInIcon className="h-6 w-6 text-white" />
        ) : (
          <ArrowsPointingOutIcon className="h-6 w-6 text-white" />
        )}
      </button>
    );
  }
);
