import { useEffect, useRef } from "react";
import { MicrophoneOffIcon, UserIcon, VideoOffIcon } from "./icons";

export const VideoTile = ({
  stream,
  isLocal,
  peerId,
  isVideoEnabled,
  userName,
}) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden">
      <div className="aspect-video w-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover scale-x-[-1] ${
            !isVideoEnabled && "hidden"
          }`}
        />

        {!isVideoEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            {userName ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                  <UserIcon className="w-14 h-14 text-gray-400" />
                </div>
                <span className="text-gray-300 text-sm">
                  {isLocal ? "You" : userName}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                  <UserIcon className="w-14 h-14 text-gray-400" />
                </div>
                <span className="text-gray-300 text-sm">
                  {isLocal ? "You" : `Peer ${peerId.slice(0, 8)}`}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-black/60 flex items-center justify-between">
          <span className="text-white text-sm">
            {isLocal ? "You" : userName || `Peer ${peerId.slice(0, 8)}`}
          </span>

          <div className="flex items-center space-x-2">
            {stream?.getAudioTracks()[0]?.enabled === false && (
              <div className="text-red-500">
                <MicrophoneOffIcon className="h-4 w-4" />
              </div>
            )}
            {!isVideoEnabled && (
              <div className="text-red-500">
                <VideoOffIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
