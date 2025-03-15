"use client";

import { useEffect, useRef, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { io } from "socket.io-client";

import { createPeer, getLocalStream } from "@/utils/peer";
import { v4 as uuidv4 } from "uuid";
import { RoomProvider, useRoom } from "@/context/room-context";
import VideoPlayer from "@/components/video-player";
import Controls from "@/components/controls";
import ParticipantList from "@/components/participant-list";

const peerConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

function RoomContent() {
  const router = useRouter();
  const params = useParams();
  const { roomId } = params;
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const host = searchParams.get("host");
  const [localStream, setLocalStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [socket, setSocket] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [userId] = useState(() => uuidv4());
  const [peerConnections] = useState(new Map());
  const { addParticipant, removeParticipant, updateParticipant, state } =
    useRoom();

  const socketRef = useRef();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [pendingOffers, setPendingOffers] = useState([]);
  const [pendingIceCandidates] = useState(new Map());

  useEffect(() => {
    if (socketRef.current) return;

    const initSocket = async () => {
      await fetch("/api/socket/io");
      const socket = io(process.env.NEXT_PUBLIC_SITE_URL, {
        path: "/api/socket/io",
        addTrailingSlash: false,
      });

      socket.on("connect", () => {
        // console.log("Socket connected with ID:", socket.id);
        socketRef.current = socket;
        setSocket(socket);
        setIsSocketConnected(true);
      });

      socket.on("connect_error", (error) => {
        // console.error("Socket connection error:", error);
        setIsSocketConnected(false);
      });

      socket.on("disconnect", () => {
        // console.log("Socket disconnected");
        setIsSocketConnected(false);
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        // console.log("Disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsSocketConnected(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSocketConnected || !roomId || !name) return;

    const setupRoom = async () => {
      try {
        const stream = await getLocalStream();
        setLocalStream(stream);

        if (pendingOffers.length > 0) {
          console.log("Processing pending offers:", pendingOffers.length);
          pendingOffers.forEach(async (pendingOffer) => {
            await handleOffer(pendingOffer.userId, pendingOffer.offer, stream);
          });
          setPendingOffers([]);
        }

        // Initially mute audio and video
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        if (audioTrack) audioTrack.enabled = false;
        if (videoTrack) videoTrack.enabled = false;

        // Add local participant
        addParticipant({
          id: userId,
          name: name,
          stream: stream,
          videoEnabled: false,
          audioEnabled: false,
          isHost: host === "true",
          localParticipantId: userId,
        });

        // Socket events for room management
        socketRef.current.on(
          "user-joined",
          async ({ userId: newUserId, name: newName, isHost: newIsHost }) => {
            console.log("New user joined:", newUserId);

            try {
              if (peerConnections.has(newUserId)) {
                console.warn(
                  `Connection already exists for ${newUserId}, closing old one`
                );
                const oldConnection = peerConnections.get(newUserId);
                oldConnection.close();
                peerConnections.delete(newUserId);
              }

              // Create new RTCPeerConnection
              const peerConnection = new RTCPeerConnection(peerConfig);

              peerConnection.oniceconnectionstatechange = () => {
                console.log(
                  "ICE Connection State changed for",
                  userId,
                  ":",
                  peerConnection.iceConnectionState
                );

                // Check for failed connections
                if (peerConnection.iceConnectionState === "failed") {
                  console.error("ICE connection failed for peer:", userId);
                }
              };

              peerConnection.onsignalingstatechange = () => {
                console.log("Signaling State:", peerConnection.signalingState);
              };

              // Store peer connection first
              peerConnections.set(newUserId, peerConnection);

              // Add local stream if available
              if (localStream) {
                localStream.getTracks().forEach((track) => {
                  peerConnection.addTrack(track, localStream);
                });
              }

              // Handle incoming stream
              peerConnection.ontrack = (event) => {
                console.log("Track event triggered for:", newUserId);
                console.log("Event streams:", event.streams);

                if (event.streams && event.streams.length > 0) {
                  const [remoteStream] = event.streams;
                  console.log(
                    "Remote stream tracks:",
                    remoteStream.getTracks()
                  );

                  // Update participant after a short delay to ensure tracks are ready
                  setTimeout(() => {
                    if (state.participants[newUserId]) {
                      updateParticipant(newUserId, {
                        stream: remoteStream,
                        videoEnabled: remoteStream
                          .getVideoTracks()
                          .some((track) => track.enabled),
                      });
                    } else {
                      addParticipant({
                        id: newUserId,
                        name: newName,
                        stream: remoteStream,
                        videoEnabled: remoteStream
                          .getVideoTracks()
                          .some((track) => track.enabled),
                        audioEnabled: remoteStream
                          .getAudioTracks()
                          .some((track) => track.enabled),
                        isHost: newIsHost,
                        localParticipantId: userId,
                      });
                    }
                  }, 1000);
                }
              };

              // Handle ICE candidates
              peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                  socketRef.current.emit("ice-candidate", {
                    roomId,
                    userId: newUserId,
                    candidate: event.candidate,
                  });
                }
              };

              // Create and send offer
              const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              });
              await peerConnection.setLocalDescription(offer);

              socketRef.current.emit("offer", {
                roomId,
                userId: newUserId,
                offer: peerConnection.localDescription,
              });
            } catch (error) {
              console.error("Error handling new user:", error);
            }
          }
        );

        socketRef.current.on("offer", async ({ userId, offer }) => {
          await handleOffer(userId, offer, localStream);
        });

        // Handle answers
        socketRef.current.on("answer", async ({ userId, answer }) => {
          const peerConnection = peerConnections.get(userId);
          if (peerConnection) {
            try {
              // Only set remote description if we're in the right state
              if (peerConnection.signalingState !== "stable") {
                console.log(
                  `Setting remote description for ${userId}, current state: ${peerConnection.signalingState}`
                );
                await peerConnection.setRemoteDescription(
                  new RTCSessionDescription(answer)
                );

                if (pendingIceCandidates.has(userId)) {
                  console.log(
                    `Processing ${
                      pendingIceCandidates.get(userId).length
                    } queued ICE candidates for ${userId}`
                  );
                  const candidates = pendingIceCandidates.get(userId);
                  for (const candidate of candidates) {
                    await peerConnection.addIceCandidate(
                      new RTCIceCandidate(candidate)
                    );
                  }
                  pendingIceCandidates.delete(userId);
                }
              } else {
                console.warn(
                  `Peer connection already in stable state for ${userId}, ignoring answer`
                );
              }
            } catch (error) {
              console.error("Error setting remote description:", error);
            }
          } else {
            console.warn(
              `No peer connection found for ${userId} when handling answer`
            );
          }
        });

        // Handle ICE candidates
        socketRef.current.on("ice-candidate", async ({ userId, candidate }) => {
          const peerConnection = peerConnections.get(userId);
          if (peerConnection) {
            try {
              // Only add ICE candidate if we have a remote description and connection is not closed
              if (
                peerConnection.remoteDescription &&
                peerConnection.signalingState !== "closed"
              ) {
                await peerConnection.addIceCandidate(
                  new RTCIceCandidate(candidate)
                );
              } else {
                console.log(
                  `Queueing ICE candidate for ${userId}, state: ${
                    peerConnection.signalingState
                  }, has remote desc: ${!!peerConnection.remoteDescription}`
                );

                // Queue the ICE candidate
                if (!pendingIceCandidates.has(userId)) {
                  pendingIceCandidates.set(userId, []);
                }
                pendingIceCandidates.get(userId).push(candidate);
              }
            } catch (error) {
              console.error("Error adding ICE candidate:", error);
            }
          } else {
            console.warn("Received ICE candidate for unknown peer:", userId);
          }
        });

        socketRef.current.on("existing-participants", (clients) => {
          clients.forEach((client) => {
            addParticipant({
              id: client.userId,
              name: client.name,
              stream: null,
              videoEnabled: client.videoEnabled,
              audioEnabled: client.audioEnabled,
              isHost: client.isHost,
              localParticipantId: userId,
            });
          });
        });

        socketRef.current.on("user-left", ({ userId }) => {
          console.log("User left:", userId);
          removeParticipant(userId);
        });

        socketRef.current.on(
          "participant-media-state",
          ({ userId, videoEnabled, audioEnabled }) => {
            updateParticipant(userId, { videoEnabled, audioEnabled });
          }
        );

        socketRef.current.on(
          "participant-stream-update",
          ({ userId, stream }) => {
            updateParticipant(userId, { stream });
          }
        );

        // Join the room
        socketRef.current.emit("join-room", {
          roomId,
          userId,
          name,
          isHost: host === "true",
          isVideoEnabled: false,
          isAudioEnabled: false,
        });
      } catch (error) {
        console.error("Error setting up room:", error);
        router.push("/");
      }
    };

    setupRoom();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-room", { roomId, userId });

        // Cleanup all socket listeners
        const events = [
          "user-joined",
          "offer",
          "answer",
          "ice-candidate",
          "user-left",
          "participant-media-state",
          "participant-stream-update",
        ];
        events.forEach((event) => socketRef.current.off(event));
      }

      // Properly cleanup streams
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
          localStream.removeTrack(track);
        });
      }

      // Cleanup peer connections
      peerConnections.forEach((connection) => {
        connection.ontrack = null;
        connection.onicecandidate = null;
        connection.oniceconnectionstatechange = null;
        connection.onsignalingstatechange = null;
        connection.close();
      });
      peerConnections.clear();

      removeParticipant(userId);
    };
  }, [isSocketConnected, roomId, name, userId, host, pendingOffers]);

  const handleOffer = async (userId, offer, stream) => {
    try {
      if (!stream) {
        console.log("Local stream not ready, queueing offer from:", userId);
        setPendingOffers((prev) => [...prev, { userId, offer }]);
        return;
      }

      const peerConnection = new RTCPeerConnection(peerConfig);

      // Add debugging for connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log(
          "ICE Connection State changed for",
          userId,
          ":",
          peerConnection.iceConnectionState
        );

        // Check for failed connections
        if (peerConnection.iceConnectionState === "failed") {
          console.error("ICE connection failed for peer:", userId);
        }
      };

      peerConnection.onsignalingstatechange = () => {
        console.log("Signaling State (offer):", peerConnection.signalingState);
      };

      // Store peer connection
      peerConnections.set(userId, peerConnection);

      // Add ontrack handler BEFORE setting remote description
      peerConnection.ontrack = (event) => {
        console.log("Track event triggered in offer handler for:", userId);
        console.log("Event streams in offer:", event.streams);

        if (event.streams && event.streams.length > 0) {
          const [remoteStream] = event.streams;
          console.log(
            "Remote stream tracks in offer:",
            remoteStream.getTracks()
          );

          // Update participant with stream
          updateParticipant(userId, {
            stream: remoteStream,
            videoEnabled: remoteStream
              .getVideoTracks()
              .some((track) => track.enabled),
            audioEnabled: remoteStream
              .getAudioTracks()
              .some((track) => track.enabled),
          });
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("ice-candidate", {
            roomId,
            userId,
            candidate: event.candidate,
          });
        }
      };

      // Add local stream
      if (stream && stream.getTracks().length > 0) {
        stream.getTracks().forEach((track) => {
          console.log(
            "Adding local track to peer connection in offer handler:",
            track
          );
          peerConnection.addTrack(track, stream);
        });
      } else {
        console.warn("No tracks found in local stream");
      }

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      if (pendingIceCandidates.has(userId)) {
        console.log(
          `Processing ${
            pendingIceCandidates.get(userId).length
          } queued ICE candidates for ${userId}`
        );
        const candidates = pendingIceCandidates.get(userId);
        for (const candidate of candidates) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingIceCandidates.delete(userId);
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socketRef.current.emit("answer", {
        roomId,
        userId,
        answer: peerConnection.localDescription,
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
        updateParticipant(userId, { audioEnabled: audioTrack.enabled });

        socketRef.current.emit("media-state-change", {
          roomId,
          videoEnabled,
          audioEnabled: audioTrack.enabled,
        });
      }
    }
  };

  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);

        // Make sure the stream is updated in the participant
        updateParticipant(userId, {
          videoEnabled: videoTrack.enabled,
          stream: localStream,
        });

        // Notify other peers about the media state change
        socketRef.current.emit("media-state-change", {
          roomId,
          videoEnabled: videoTrack.enabled,
          audioEnabled,
        });
      }
    }
  };

  // console.log(state.participants);

  const leaveRoom = () => {
    // Close all connections
    // connections.forEach((connection) => connection.close());
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Remove participant
    removeParticipant(userId);
    // Navigate away
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(state.participants).map((participant) => (
              <VideoPlayer key={participant.id} participant={participant} />
            ))}
          </div>
        </div>
        <div className="md:col-span-1">
          <ParticipantList />
        </div>
      </div>
      <Controls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onLeaveRoom={leaveRoom}
      />
    </div>
  );
}

export default function Room() {
  const params = useParams();
  const { roomId } = params;
  const searchParams = useSearchParams();
  const host = searchParams.get("host");
  const name = searchParams.get("name");

  if (!roomId || !name) {
    return <div>Loading...</div>;
  }

  const initialState = {
    participants: {},
    kickedParticipants: [],
    roomId: roomId,
    isHost: host === "true",
  };

  return (
    <RoomProvider initialState={initialState}>
      <RoomContent />
    </RoomProvider>
  );
}
