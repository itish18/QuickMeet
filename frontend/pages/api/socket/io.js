import { Server } from "socket.io";

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on(
        "join-room",
        ({ roomId, userId, name, isHost, isVideoEnabled, isAudioEnabled }) => {
          console.log("hit on join room");
          socket.join(roomId);
          socket.roomId = roomId;
          socket.userId = userId;
          socket.userName = name;
          socket.isHost = isHost;
          socket.videoEnabled = isVideoEnabled;
          socket.audioEnabled = isAudioEnabled;

          // Get all users in the room
          const clients = Array.from(
            io.sockets.adapter.rooms.get(roomId) || []
          );

          console.log("client", clients);

          // Notify others in the room about the new peer
          socket.to(roomId).emit("user-joined", {
            roomId,
            userId,
            name,
            isHost,
            videoEnabled: isVideoEnabled,
            audioEnabled: isAudioEnabled,
          });

          // Send existing participants to the new peer
          const existingParticipants = clients
            .filter((clientId) => clientId !== socket.id)
            .map((clientId) => {
              const clientSocket = io.sockets.sockets.get(clientId);
              return {
                userId: clientSocket.userId,
                name: clientSocket.userName,
                isHost: clientSocket.isHost,
                videoEnabled: clientSocket.videoEnabled,
                audioEnabled: clientSocket.audioEnabled,
              };
            });

          console.log("existing clients", existingParticipants);
          socket.emit("existing-participants", existingParticipants);
        }
      );

      socket.on(
        "media-state-change",
        ({ roomId, videoEnabled, audioEnabled }) => {
          socket.to(roomId).emit("participant-media-state", {
            userId: socket.userId,
            videoEnabled,
            audioEnabled,
          });
        }
      );

      socket.on("stream-update", ({ roomId, stream }) => {
        socket.to(roomId).emit("participant-stream-update", {
          userId: socket.userId,
          stream,
        });
      });

      socket.on("leave-room", ({ roomId, userId }) => {
        socket.to(roomId).emit("user-left", { userId });
        socket.leave(roomId);
      });

      socket.on("disconnect", () => {
        if (socket.roomId && socket.userId) {
          socket.to(socket.roomId).emit("user-left", { userId: socket.userId });
        }
      });

      socket.on("offer", ({ roomId, userId, offer }) => {
        socket.to(roomId).emit("offer", {
          userId: socket.userId,
          offer,
        });
      });

      socket.on("answer", ({ roomId, userId, answer }) => {
        socket.to(roomId).emit("answer", {
          userId: socket.userId,
          answer,
        });
      });

      socket.on("ice-candidate", ({ roomId, userId, candidate }) => {
        socket.to(roomId).emit("ice-candidate", {
          userId: socket.userId,
          candidate,
        });
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default ioHandler;
