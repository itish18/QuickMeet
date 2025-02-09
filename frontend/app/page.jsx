"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import Peer from "peerjs";

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [peerId, setPeerId] = useState(null);
  const [allRooms, setAllRooms] = useState({});

  const [createPassword, setCreatePassword] = useState("");

  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  const peerRef = useRef();

  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", (id) => {
      setPeerId(id);
    });

    peer.on("error", (error) => {
      console.log("Peer error:", error);
      setError("Failed to initialize connection");
    });

    return () => {
      peer.destroy();
      peerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const existingSessionId = localStorage.getItem("sessionId");
    if (!existingSessionId) {
      localStorage.setItem("sessionId", uuidv4());
    }
  }, []);

  useEffect(() => {
    const fetchAllRooms = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/rooms");

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to get rooms");

        setAllRooms(data);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAllRooms();
  }, []);

  const handleCreateRoom = async () => {
    try {
      if (!peerId) {
        throw new Error("Connection not initialized");
      }

      setLoading(true);
      setError("");

      const roomId = uuidv4();
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          password: createPassword,
          creatorPeerId: peerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create room");
      }

      sessionStorage.setItem(
        "roomCredentials",
        JSON.stringify({
          roomId,
          password: createPassword,
          isAdmin: true,
          peerId,
        })
      );

      router.push(`/room/${roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      if (!peerId) {
        throw new Error("Connection not initialized");
      }

      setLoading(true);
      setError("");

      const sessionId = localStorage.getItem("sessionId");

      const toJoinId = joinRoomId || roomId;

      const response = await fetch("/api/rooms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: toJoinId,
          password: joinPassword,
          peerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join room");
      }

      sessionStorage.setItem(
        "roomCredentials",
        JSON.stringify({
          roomId: toJoinId,
          password: joinPassword,
          isAdmin: false,
          peerId,
          sessionId,
        })
      );

      router.push(`/room/${toJoinId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          {!peerId ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">
                Initializing connection...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isCreating ? "Create a Room" : "Join a Room"}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {isCreating
                    ? "Create a new room and share the ID with others"
                    : "Enter room ID and password to join"}
                </p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6">
                {isCreating ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Room Password
                      </label>
                      <input
                        type="password"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        className="mt-1 outline-none px-2 py-1  text-black block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter room password"
                        minLength={4}
                        required
                      />
                    </div>
                    <button
                      onClick={handleCreateRoom}
                      disabled={loading || !createPassword}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? "Creating..." : "Create Room"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Room ID
                      </label>
                      <input
                        type="text"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        className="mt-1 block w-full rounded-md border px-2 py-1 outline-none text-black border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter room ID"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        type="password"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border px-2 py-1 outline-none text-black border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter room password"
                        required
                      />
                    </div>
                    <button
                      onClick={handleJoinRoom}
                      disabled={loading || !joinRoomId || !joinPassword}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? "Joining..." : "Join Room"}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsCreating(!isCreating);
                    setError("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  {isCreating
                    ? "Want to join an existing room?"
                    : "Want to create a new room?"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {!loading && Object.entries(allRooms).length > 0 && (
        <div>
          <p className="text-black font-bold my-4">All rooms</p>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(allRooms).map(([roomId, roomInfo]) => {
              return (
                <div
                  className="border border-gray-200 rounded p-2 shadow-lg w-full  h-full"
                  key={roomId}
                >
                  <p className="text-black text-sm">
                    Joined users: {roomInfo.peerCount}
                  </p>
                  <p className="text-gray-400 text-xs">
                    Created at: {format(new Date(roomInfo.createdAt), "h:mm a")}
                  </p>
                  <p className="text-black text-xs">{roomId}</p>

                  <button
                    onClick={() => handleJoinRoom(roomId)}
                    className="w-full text-sm py-1 mt-2 cursor-pointer bg-blue-500 text-white text-center rounded"
                  >
                    Join
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
