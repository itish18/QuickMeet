import { NextResponse } from "next/server";

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  static Room = class {
    constructor(roomId, password, creatorPeerId) {
      this.roomId = roomId;
      this.connections = new Set();
      this.password = password;
      this.creatorPeerId = creatorPeerId;
      this.metadata = {
        createdAt: Date.now(),
        lastActivity: Date.now(),
        mutedUsers: new Set(),
        kickedUsers: new Set(),
        isLocked: false,
        screenSharingPeerId: null,
      };
      this.messages = [];
    }

    addConnection(peerId, userData = {}) {
      const { sessionId } = userData;

      if (sessionId && this.metadata.kickedUsers.has(sessionId)) {
        throw new Error("You have been banned from this room");
      }

      if (this.metadata.isLocked && peerId !== this.creatorPeerId) {
        throw new Error("Room is locked");
      }

      this.connections.add(peerId);
      this.metadata.lastActivity = Date.now();

      const userState = {
        isMuted: this.metadata.mutedUsers.has(peerId),
        isAdmin: this.creatorPeerId === peerId,
        ...userData,
      };

      return {
        peers: Array.from(this.connections),
        userState,
        messages: this.messages,
        metadata: this.metadata,
      };
    }

    removeConnection(peerId) {
      this.connections.delete(peerId);
      this.metadata.lastActivity = Date.now();

      if (this.metadata.screenSharingPeerId === peerId) {
        this.metadata.screenSharingPeerId = null;
      }

      return this.connections.size;
    }

    muteUser(targetPeerId, adminPeerId) {
      if (this.creatorPeerId !== adminPeerId) {
        throw new Error("Unauthorized action");
      }
      this.metadata.mutedUsers.add(targetPeerId);
    }

    unmuteUser(targetPeerId, adminPeerId) {
      if (this.creatorPeerId !== adminPeerId) {
        throw new Error("Unauthorized action");
      }
      this.metadata.mutedUsers.delete(targetPeerId);
    }

    kickUser(targetPeerId, adminPeerId, sessionId) {
      if (this.creatorPeerId !== adminPeerId) {
        throw new Error("Unauthorized action");
      }
      if (sessionId) {
        this.metadata.kickedUsers.add(sessionId);
      }
      this.connections.delete(targetPeerId);
    }

    startScreenShare(peerId) {
      if (this.metadata.screenSharingPeerId) {
        throw new Error("Someone is already sharing their screen");
      }
      this.metadata.screenSharingPeerId = peerId;
    }

    stopScreenShare(peerId) {
      if (this.metadata.screenSharingPeerId === peerId) {
        this.metadata.screenSharingPeerId = null;
      }
    }

    lockRoom(adminPeerId) {
      if (this.creatorPeerId !== adminPeerId) {
        throw new Error("Unauthorized action");
      }
      this.metadata.isLocked = true;
    }

    unlockRoom(adminPeerId) {
      if (this.creatorPeerId !== adminPeerId) {
        throw new Error("Unauthorized action");
      }
      this.metadata.isLocked = false;
    }

    addMessage(message) {
      this.messages.push({
        ...message,
        timestamp: Date.now(),
      });

      if (this.messages.length > 100) {
        this.messages.shift();
      }
    }

    verifyPassword(password) {
      return this.password === password;
    }

    getConnections() {
      return Array.from(this.connections);
    }

    isEmpty() {
      return this.connections.size === 0;
    }

    toJSON() {
      return {
        roomId: this.roomId,
        peers: Array.from(this.connections),
        metadata: {
          ...this.metadata,
          mutedUsers: Array.from(this.metadata.mutedUsers),
          kickedUsers: Array.from(this.metadata.kickedUsers),
        },
        createdAt: this.metadata.createdAt,
        lastActivity: this.metadata.lastActivity,
        peerCount: this.connections.size,
        creatorPeerId: this.creatorPeerId,
      };
    }
  };

  createRoom(roomId, password, creatorPeerId) {
    if (this.rooms.has(roomId)) {
      throw new Error("Room already exists");
    }
    const room = new RoomManager.Room(roomId, password, creatorPeerId);
    this.rooms.set(roomId, room);
    return room;
  }

  verifyRoom(roomId, password) {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("Room not found");
    }
    if (room.isLocked && !room.verifyPassword(password)) {
      throw new Error("Invalid password");
    }
    return room;
  }

  joinRoom(roomId, peerId, password, userData = {}) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (!room.verifyPassword(password)) {
      throw new Error("Invalid password");
    }

    return room.addConnection(peerId, userData);
  }

  leaveRoom(roomId, peerId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const remainingPeers = room.removeConnection(peerId);
    if (remainingPeers === 0) {
      this.rooms.delete(roomId);
    }
    return true;
  }

  getRoomPeers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.getPeers() : [];
  }

  roomExists(roomId) {
    return this.rooms.has(roomId);
  }

  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.toJSON() : null;
  }

  getAllRooms() {
    const roomsInfo = {};
    for (const [roomId, room] of this.rooms) {
      roomsInfo[roomId] = room.toJSON();
    }
    return roomsInfo;
  }
}

if (!global.roomManager) {
  global.roomManager = new RoomManager();
}

export const roomManager = global.roomManager;
