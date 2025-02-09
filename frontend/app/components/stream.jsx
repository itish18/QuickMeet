import { memo } from "react";
import { MediaControls } from "./media-controls";
import { VideoTile } from "./video-tile";

export const Stream = memo(
  ({
    localVideoRef,
    remoteStreams,
    localPeerId,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    stream,
    peerId,
    isAdmin,
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
    peerInfo,
  }) => {
    return (
      <div className="min-h-screen w-full p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <VideoTile
              stream={stream}
              isLocal={true}
              peerId={peerId}
              isVideoEnabled={isVideoEnabled}
              userName="You"
            />

            {Array.from(remoteStreams.entries()).map(
              ([remotePeerId, remoteStream]) => {
                if (remotePeerId === localPeerId) return;
                const peer = peerInfo.get(remotePeerId) || {};
                return (
                  <VideoTile
                    key={remotePeerId}
                    stream={remoteStream}
                    isLocal={false}
                    peerId={remotePeerId}
                    isVideoEnabled={peer.isVideoEnabled}
                    userName={peer.userName}
                  />
                );
              }
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4">
            <div className="max-w-7xl mx-auto flex justify-center">
              <MediaControls
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onStartScreenShare={startScreenShare}
                onStopScreenShare={stopScreenShare}
                isScreenSharing={isScreenSharing}
                isAdmin={isAdmin}
                connections={Array.from(remoteStreams)}
                localPeerId={localPeerId}
                muteUser={muteUser}
                unmuteUser={unmuteUser}
                kickUser={kickUser}
                broadcast={broadcast}
                isMuted={isMuted}
                currentRoomState={currentRoomState}
                shareFile={shareFile}
                fileTransfers={fileTransfers}
                isRecording={isRecording}
                recordingTime={recordingTime}
                startRecording={startRecording}
                stopRecording={stopRecording}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);
