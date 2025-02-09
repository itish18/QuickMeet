import Peer from "peerjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const usePeer = (roomId) => {
  const [peerId, setPeerId] = useState(null);
  const [connections, setConnections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stream, setStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [error, setError] = useState(null);
  const [fileTransfers, setFileTransfers] = useState(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [peerInfo, setPeerInfo] = useState(new Map());

  const peerRef = useRef();
  const peerIdRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const localVideoRef = useRef();
  const messagesRef = useRef([]);
  const previousStreamRef = useRef(null);
  const streamRef = useRef(null);
  const fileChunksRef = useRef(new Map());
  const recorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const getRoomCredentials = useCallback(() => {
    const credentials = sessionStorage.getItem("roomCredentials");
    if (!credentials) {
      throw new Error("No room credentials found");
    }
    return JSON.parse(credentials);
  }, []);

  const fetchRoomState = useCallback(async () => {
    try {
      const { password } = getRoomCredentials();
      const response = await fetch(`/api/rooms/${roomId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) throw new Error("Failed to fetch room state");

      const state = await response.json();
      setRoomState(state);

      setIsAdmin(state.metadata.creatorPeerId === peerIdRef.current);
      setIsMuted(state.metadata.mutedUsers.includes(peerIdRef.current));

      return state;
    } catch (error) {
      setError(error.message);
      return null;
    }
  }, [roomId]);

  const handlePeerDisconnection = useCallback((peerId) => {
    console.log("Peer disconnected:", peerId);

    setRemoteStreams((prev) => {
      const newStreams = new Map(prev);
      newStreams.delete(peerId);
      return newStreams;
    });

    connectionsRef.current.delete(peerId);
    setConnections(Array.from(connectionsRef.current.values()));

    setPeerInfo((prev) => {
      const newPeerInfo = new Map(prev);
      newPeerInfo.delete(peerId);
      return newPeerInfo;
    });
  }, []);

  const handleConnection = useCallback(
    (connection) => {
      connection.on("open", () => {
        const { sessionId } = connection?.metadata || {};
        setPeerInfo((prev) => {
          const newPeerInfo = new Map(prev);
          newPeerInfo.set(connection.peer, {
            isVideoEnabled: false,
            isAudioEnabled: false,
          });
          return newPeerInfo;
        });
        connectionsRef.current.set(connection.peer, {
          connection,
          sessionId,
        });
        setConnections(Array.from(connectionsRef.current.values()));
      });

      connection.on("data", (data) => {
        if (data.type === "file_metadata") {
          fileChunksRef.current.set(data.fileId, {
            chunks: new Array(data.totalChunks),
            metadata: data,
            receivedChunks: 0,
          });

          setFileTransfers((prev) => {
            const newTransfers = new Map(prev);
            newTransfers.set(data.fileId, {
              fileName: data.fileName,
              type: "download",
              progress: 0,
              total: data.totalChunks,
              sender: data.sender,
            });
            return newTransfers;
          });
        } else if (data.type === "file_chunk") {
          const fileTransfer = fileChunksRef.current.get(data.fileId);
          if (fileTransfer) {
            fileTransfer.chunks[data.chunkIndex] = data.data;
            fileTransfer.receivedChunks++;

            setFileTransfers((prev) => {
              const newTransfers = new Map(prev);
              const transfer = newTransfers.get(data.fileId);
              if (transfer) {
                transfer.progress = fileTransfer.receivedChunks;
              }
              return newTransfers;
            });

            if (
              fileTransfer.receivedChunks === fileTransfer.metadata.totalChunks
            ) {
              const blob = new Blob(fileTransfer.chunks, {
                type: fileTransfer.metadata.fileType,
              });
              const url = URL.createObjectURL(blob);

              const a = document.createElement("a");
              a.href = url;
              a.download = fileTransfer.metadata.fileName;
              a.click();

              URL.revokeObjectURL(url);
              fileChunksRef.current.delete(data.fileId);

              setTimeout(() => {
                setFileTransfers((prev) => {
                  const newTransfers = new Map(prev);
                  newTransfers.delete(data.fileId);
                  return newTransfers;
                });
              }, 3000);
            }
          }
        } else if (data.type === "admin_action") {
          handleAdminAction(data);
        } else if (data.type === "chat") {
          messagesRef.current = [...messagesRef.current, data];
          setMessages(messagesRef.current);
        } else if (data.type === "media_state_change") {
          setPeerInfo((prev) => {
            const newPeerInfo = new Map(prev);
            const peerData = newPeerInfo.get(data.peerId) || {};

            if (data.kind === "video") {
              peerData.isVideoEnabled = data.enabled;
            } else if (data.kind === "audio") {
              peerData.isAudioEnabled = data.enabled;
            }

            newPeerInfo.set(data.peerId, peerData);
            return newPeerInfo;
          });
        } else if (data.type === "peer_leaving") {
          handlePeerDisconnection(data.peerId);
        }
      });

      connection.on("close", () => {
        handlePeerDisconnection(connection.peer);
      });

      connection.on("error", (error) => {
        console.log("Connection error:", error);
        handlePeerDisconnection(connection.peer);
      });
    },
    [handlePeerDisconnection]
  );

  const broadcast = useCallback((data) => {
    const messageData = {
      ...data,
      sender: peerIdRef.current,
      timestamp: Date.now(),
    };

    if (data.type === "chat") {
      messagesRef.current = [...messagesRef.current, messageData];

      requestAnimationFrame(() => {
        setMessages(messagesRef.current);
      });
    }

    connectionsRef.current.forEach((connection) => {
      connection.connection.send(messageData);
    });
  }, []);

  const performAdminAction = useCallback(
    async (action, targetPeerId, targetSessionId) => {
      if (!isAdmin) return;

      try {
        const { password } = getRoomCredentials();
        const response = await fetch("/api/rooms/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            action,
            targetPeerId,
            targetSessionId,
            adminPeerId: peerIdRef.current,
            password,
          }),
        });

        if (!response.ok) throw new Error("Failed to perform admin action");

        const { room } = await response.json();
        setRoomState(room);

        broadcast({
          type: "admin_action",
          action,
          targetPeerId,
          targetSessionId,
          adminPeerId: peerIdRef.current,
        });
      } catch (error) {
        setError(error.message);
      }
    },
    [roomId, isAdmin, broadcast, getRoomCredentials]
  );

  const muteUser = useCallback(
    (targetPeerId) => {
      performAdminAction(
        "mute",
        targetPeerId,
        connectionsRef.current.get(targetPeerId).sessionId
      );
    },
    [performAdminAction]
  );

  const unmuteUser = useCallback(
    (targetPeerId) => {
      performAdminAction(
        "unmute",
        targetPeerId,
        connectionsRef.current.get(targetPeerId).sessionId
      );
    },
    [performAdminAction]
  );

  const kickUser = useCallback(
    (targetPeerId, targetSessionId) => {
      performAdminAction(
        "kick",
        targetPeerId,
        connectionsRef.current.get(targetPeerId).sessionId
      );
    },
    [performAdminAction]
  );

  const handleAdminAction = useCallback((data) => {
    if (data.targetPeerId === peerIdRef.current) {
      switch (data.action) {
        case "mute":
          if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = false;
              setIsAudioEnabled(false);
              setIsMuted(true);
            }
          }
          break;
        case "unmute":
          if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = true;
              setIsAudioEnabled(true);
              setIsMuted(false);
            }
          }
          break;
        case "kick":
          if (data.targetSessionId) {
            const kickedRooms = JSON.parse(
              localStorage.getItem("kickedRooms") || "{}"
            );
            kickedRooms[roomId] = data.targetSessionId;
            localStorage.setItem("kickedRooms", JSON.stringify(kickedRooms));
          }
          window.location.href = "/";
          break;
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        broadcast({
          type: "media_state_change",
          kind: "audio",
          enabled: audioTrack.enabled,
          peerId: peerIdRef.current,
        });
      }
    }
  }, [broadcast]);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        broadcast({
          type: "media_state_change",
          kind: "video",
          enabled: videoTrack.enabled,
          peerId: peerIdRef.current,
        });
      }
    }
  }, [broadcast]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      previousStreamRef.current = streamRef.current;

      await fetch("/api/rooms/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          action: "startScreenShare",
          peerId: peerIdRef.current,
        }),
      });

      if (peerRef.current) {
        const peers = Array.from(connectionsRef.current.keys());
        peers.forEach((peerId) => {
          peerRef.current.connections[peerId]?.forEach((conn) => {
            if (conn.type === "media") conn.close();
          });

          const call = peerRef.current.call(peerId, screenStream);
          call.on("stream", (remoteStream) => {
            setRemoteStreams((prev) => new Map(prev).set(peerId, remoteStream));
          });
        });
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      streamRef.current = screenStream;
      setStream(screenStream);
      setIsScreenSharing(true);

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.log("Error starting screen share:", error);
    }
  }, [roomId]);

  const stopScreenShare = useCallback(async () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      await fetch("/api/rooms/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          action: "stopScreenShare",
          peerId: peerIdRef.current,
        }),
      });

      if (previousStreamRef.current) {
        streamRef.current = previousStreamRef.current;
        setStream(previousStreamRef.current);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = previousStreamRef.current;
        }
      }

      setIsScreenSharing(false);
      previousStreamRef.current = null;
    } catch (error) {
      console.log("Error stopping screen share:", error);
    }
  }, [roomId]);

  const setupRecordingCanvas = useCallback(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      const ctx = canvasRef.current.getContext("2d");

      canvasRef.current.width = 1280;
      canvasRef.current.height = 720;

      const drawVideoGrid = () => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext("2d");
        const videos = document.querySelectorAll("video");
        const totalVideos = videos.length;

        if (totalVideos === 0) return;

        const rows = Math.ceil(Math.sqrt(totalVideos));
        const cols = Math.ceil(totalVideos / rows);
        const videoWidth = canvasRef.current.width / cols;
        const videoHeight = canvasRef.current.height / rows;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        videos.forEach((video, index) => {
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const x = (index % cols) * videoWidth;
            const y = Math.floor(index / cols) * videoHeight;
            ctx.drawImage(video, x, y, videoWidth, videoHeight);
          }
        });

        animationFrameRef.current = requestAnimationFrame(drawVideoGrid);
      };

      drawVideoGrid();
    }

    return canvasRef.current;
  }, []);

  const getCombinedStream = useCallback(() => {
    const canvas = setupRecordingCanvas();
    const canvasStream = canvas.captureStream(30);

    const audioTracks = [];

    if (streamRef.current?.getAudioTracks().length > 0) {
      const localAudio = streamRef.current.getAudioTracks()[0];
      if (localAudio.enabled) {
        audioTracks.push(localAudio);
      }
    }

    remoteStreams.forEach((stream) => {
      if (stream.getAudioTracks().length > 0) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack.enabled) {
          audioTracks.push(audioTrack);
        }
      }
    });

    return new MediaStream([canvasStream.getVideoTracks()[0], ...audioTracks]);
  }, [remoteStreams]);

  const startRecording = useCallback(async () => {
    try {
      const combinedStream = getCombinedStream();
      const options = {
        mimeType: "video/webm;codecs=vp8,opus",
        videoBitsPerSecond: 3000000,
      };

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        a.href = url;
        a.download = `recording-${timestamp}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];

        if (canvasRef.current) {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          canvasRef.current = null;
        }
      };

      mediaRecorder.start(1000);
      recorderRef.current = mediaRecorder;
      setIsRecording(true);

      let time = 0;
      recordingTimerRef.current = setInterval(() => {
        time += 1;
        setRecordingTime(time);
      }, 1000);

      broadcast({
        type: "recording_started",
        peerId: peerIdRef.current,
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      setError("Failed to start recording");
    }
  }, [getCombinedStream, broadcast]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
      recorderRef.current = null;
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        setRecordingTime(0);
      }

      broadcast({
        type: "recording_stopped",
        peerId: peerIdRef.current,
      });
    }
  }, [broadcast]);

  const shareFile = useCallback(
    async (file) => {
      try {
        const chunkSize = 16384;
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileId = `${Date.now()}-${file.name}`;

        broadcast({
          type: "file_metadata",
          fileId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          totalChunks,
          sender: peerIdRef.current,
        });

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);
          const buffer = await chunk.arrayBuffer();

          broadcast({
            type: "file_chunk",
            fileId,
            chunkIndex: i,
            data: buffer,
            sender: peerIdRef.current,
          });

          setFileTransfers((prev) => {
            const newTransfers = new Map(prev);
            const currentTransfer = newTransfers.get(fileId) || {
              fileName: file.name,
              type: "upload",
              progress: 0,
              total: totalChunks,
            };
            currentTransfer.progress = i + 1;
            newTransfers.set(fileId, currentTransfer);
            return newTransfers;
          });
        }
      } catch (error) {
        setError("Failed to share file");
        console.error("File sharing error:", error);
      }
    },
    [broadcast]
  );

  const call = useCallback((toConnectPeerId) => {
    if (!streamRef.current) return;
    const call = peerRef.current.call(toConnectPeerId, streamRef.current);

    call.on("stream", (remoteStream) => {
      setRemoteStreams((prev) =>
        new Map(prev).set(toConnectPeerId, remoteStream)
      );
    });

    call.on("close", () => {
      setRemoteStreams((prev) => {
        const newStreams = new Map(prev);
        newStreams.delete(toConnectPeerId);
        return newStreams;
      });
    });
  }, []);

  const connectToPeer = useCallback(
    (toConnectPeerId) => {
      if (
        !peerRef.current ||
        !toConnectPeerId ||
        toConnectPeerId === peerIdRef.current
      )
        return;
      if (connectionsRef.current.has(toConnectPeerId)) return;

      const { sessionId } = getRoomCredentials();

      const connection = peerRef.current.connect(toConnectPeerId, {
        metadata: { sessionId },
      });

      call(toConnectPeerId);

      handleConnection(connection);
    },
    [call, handleConnection]
  );

  const sendToPeer = useCallback((targetPeerId, data) => {
    const connection = connectionsRef.current.get(targetPeerId);
    if (connection) {
      connection.connection.send({
        ...data,
        sender: peerIdRef.current,
        timestamp: Date.now(),
      });
    }
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        mediaStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
        setStream(mediaStream);
        streamRef.current = mediaStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
      })
      .catch((error) => {
        console.log("Error accessing media devices:", error);
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    const initializePeer = async () => {
      try {
        const {
          peerId: storedPeerId,
          password,
          sessionId,
        } = getRoomCredentials();

        const peer = new Peer(storedPeerId);
        peerRef.current = peer;

        peer.on("open", async (id) => {
          setPeerId(id);
          peerIdRef.current = id;

          try {
            const response = await fetch("/api/rooms/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomId,
                peerId: id,
                password,
                userData: { sessionId },
              }),
            });

            if (!response.ok) throw new Error("Failed to join room");

            const { userState, peers } = await response.json();

            setIsAdmin(userState.isAdmin);
            setIsMuted(userState.isMuted);
            peers.forEach((peer) => connectToPeer(peer));
          } catch (error) {
            console.log(error);
            setError(error.message);
            window.location.href = "/";
          }
        });

        peer.on("call", (call) => {
          call.answer(streamRef.current);

          call.on("stream", (remoteStream) => {
            setRemoteStreams((prev) =>
              new Map(prev).set(call.peer, remoteStream)
            );
          });

          call.on("close", () => {
            setRemoteStreams((prev) => {
              const newStreams = new Map(prev);
              newStreams.delete(call.peer);
              return newStreams;
            });
          });
        });

        peer.on("connection", handleConnection);
        peer.on("close", () => {
          console.log("Peer connection closed");
          setRemoteStreams(new Map());
          connectionsRef.current.clear();
          setConnections([]);
          setPeerInfo(new Map());
        });
        peer.on("error", (error) => {
          console.log("Peer error:", error);
          setError(error.message);
        });

        const handleBeforeUnload = () => {
          broadcast({
            type: "peer_leaving",
            peerId: peerIdRef.current,
          });

          connectionsRef.current.forEach((conn) => conn.close());
          peer.destroy();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
      } catch (error) {
        setError(error.message);
        window.location.href = "/";
      }
    };

    initializePeer();

    return () => {
      if (peerId) {
        const { password } = getRoomCredentials();
        fetch("/api/rooms/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, peerId, password }),
        }).catch(console.error);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }

      connectionsRef.current?.forEach((conn) => conn.connection.close());
      streamRef.current?.getTracks().forEach((track) => track.stop());
      peerRef.current?.destroy();
      peerRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (canvasRef.current) {
        canvasRef.current = null;
      }
    };
  }, []);

  // useEffect(() => {
  //   const interval = setInterval(fetchRoomState, 5000);
  //   return () => clearInterval(interval);
  // }, [fetchRoomState]);

  const memoizedRemoteStreams = useMemo(() => remoteStreams, [remoteStreams]);

  return {
    peerId: peerIdRef.current,
    connections: Array.from(connectionsRef.current.values()),
    error,
    stream: streamRef.current,
    localVideoRef,
    remoteStreams: memoizedRemoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isMuted,
    isAdmin,
    roomState,
    messages,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    muteUser,
    unmuteUser,
    kickUser,
    broadcast,
    sendToPeer,
    currentRoomState: roomState,
    shareFile,
    fileTransfers,
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    peerInfo,
  };
};
