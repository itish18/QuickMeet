import { useEffect, useRef } from "react";

const VideoPlayer = ({ participant }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (participant.stream) {
      console.log("Setting video stream for participant:", participant.id);
      console.log("Stream tracks:", participant.stream.getTracks());

      if (videoRef.current) {
        videoRef.current.srcObject = participant.stream;
      }
    }
  }, [participant.stream]);

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.id === participant.localParticipantId}
        className={`w-full h-full object-cover ${
          participant.videoEnabled ? "block" : "hidden"
        }`}
      />
      {!participant.videoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-2xl text-white">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
