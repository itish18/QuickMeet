import {
  MicrophoneIcon,
  VideoCameraIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/solid";
import {
  MicrophoneIcon as MicrophoneIconOutline,
  VideoCameraIcon as VideoCameraIconOutline,
} from "@heroicons/react/24/outline";
import { memo, useState } from "react";
import { ScreenShareButton } from "./screen-share-button";
import { ConnectionsModal } from "./connections-modal";
import { FileSharing } from "./file-sharing";
import { Recording } from "./recording";

export const MediaControls = memo(
  ({
    isAudioEnabled,
    isVideoEnabled,
    onToggleAudio,
    onToggleVideo,
    onStartScreenShare,
    onStopScreenShare,
    isScreenSharing,
    isAdmin,
    connections,
    localPeerId,
    muteUser,
    unmuteUser,
    kickUser,
    broadcast,
    isMuted,
    currentRoomState,
    shareFile,
    fileTransfers,
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
  }) => {
    const [showAdminOptions, setShowAdminOptions] = useState(false);

    return (
      <div className="flex flex-col items-center justify-center">
        {showAdminOptions && connections?.length > 0 && (
          <ConnectionsModal
            connections={connections}
            localPeerId={localPeerId}
            muteUser={muteUser}
            unmuteUser={unmuteUser}
            kickUser={kickUser}
            broadcast={broadcast}
            isMuted={isMuted}
            currentRoomState={currentRoomState}
          />
        )}

        <FileSharing shareFile={shareFile} fileTransfers={fileTransfers} />
        <div className="flex items-center justify-center gap-4 bg-gray-800 p-4 rounded-lg">
          <button
            onClick={onToggleAudio}
            className={`p-3 rounded-full ${
              isAudioEnabled
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-red-500 hover:bg-red-600"
            } transition-colors`}
            title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {isAudioEnabled ? (
              <MicrophoneIcon className="h-6 w-6 text-white" />
            ) : (
              <MicrophoneIconOutline className="h-6 w-6 text-white" />
            )}
          </button>

          <button
            onClick={onToggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-red-500 hover:bg-red-600"
            } transition-colors`}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled ? (
              <VideoCameraIcon className="h-6 w-6 text-white" />
            ) : (
              <VideoCameraIconOutline className="h-6 w-6 text-white" />
            )}
          </button>

          {/* <ScreenShareButton
          isScreenSharing={isScreenSharing}
          onStartScreenShare={onStartScreenShare}
          onStopScreenShare={onStopScreenShare}
        /> */}

          {isAdmin && (
            <button
              onClick={() => setShowAdminOptions((prev) => !prev)}
              className={
                "p-3 rounded-full bg-blue-500 hover-bg-blue-600 transition-colors"
              }
            >
              <EllipsisVerticalIcon className="h-6 w-6 text-white" />
            </button>
          )}

          {isAdmin && (
            <Recording
              isRecording={isRecording}
              recordingTime={recordingTime}
              startRecording={startRecording}
              stopRecording={stopRecording}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>
    );
  }
);
