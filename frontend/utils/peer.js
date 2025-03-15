import Peer from "peerjs";

export const createPeer = (userId) => {
  return new Peer(userId, {
    host: "localhost",
    port: 9001,
    path: "/myPeerApp",
    debug: 3,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    },
  });
};

export const getLocalStream = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
  } catch (error) {
    console.error("Error getting local stream:", error);
    throw error;
  }
};
