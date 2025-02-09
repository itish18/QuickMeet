"use client";

import { Stream } from "@/app/components/stream";
import { usePeer } from "@/hooks/use-peer";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Room() {
  const params = useParams();
  const {
    peers,
    peerId: localPeerId,
    broadcast,
    messages,
    localVideoRef,
    remoteStreams,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    startScreenShare,
    isScreenSharing,
    stopScreenShare,
    stream,
    isAdmin,
    muteUser,
    unmuteUser,
    kickUser,
    isMuted,
    currentRoomState,
    shareFile,
    fileTransfers,
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    peerInfo,
  } = usePeer(params.roomId);

  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (!message.trim()) return;

    broadcast({
      type: "chat",
      content: message,
    });

    setMessage("");
  };

  return (
    <div className="flex flex-row gap-0 bg-black-100 items-start justify-between p-4">
      <Stream
        localVideoRef={localVideoRef}
        remoteStreams={remoteStreams}
        localPeerId={localPeerId}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        toggleAudio={toggleAudio}
        toggleVideo={toggleVideo}
        startScreenShare={startScreenShare}
        isScreenSharing={isScreenSharing}
        stopScreenShare={stopScreenShare}
        stream={stream}
        isAdmin={isAdmin}
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
        peerInfo={peerInfo}
      />

      <div className="flex flex-col gap-5 items-start">
        <div className="flex flex-row items-center gap-2">
          <p onClick={() => navigator.clipboard.writeText(params.roomId)}>
            Room ID : {params.roomId}
          </p>
        </div>
        <div className="bg-gray-800 rounded py-2 px-2 w-full ">
          <p className="text-gray-100 font-bold">Messages</p>
          <div className="flex flex-col gap-1 max-h-[30vh] h-full overflow-y-scroll">
            {messages.map((mess, index) => (
              <span
                className="truncate text-wrap  max-w-xs text-white font-lighter text-sm"
                key={index}
              >
                {mess.content}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 border p-2 rounded text-black"
            placeholder="Type a message..."
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
