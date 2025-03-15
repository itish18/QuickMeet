import React from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";

const Controls = ({
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveRoom,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onToggleAudio}
          className={`p-4 rounded-full ${
            audioEnabled ? "bg-gray-600" : "bg-red-600"
          }`}
        >
          {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button
          onClick={onToggleVideo}
          className={`p-4 rounded-full ${
            videoEnabled ? "bg-gray-600" : "bg-red-600"
          }`}
        >
          {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button
          onClick={onLeaveRoom}
          className="bg-red-600 px-6 py-2 rounded-full"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
};

export default Controls;
