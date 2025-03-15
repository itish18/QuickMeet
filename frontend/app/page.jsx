"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const createRoom = () => {
    if (!name) {
      setError("Please enter your name");
      return;
    }
    const newRoomId = uuidv4();
    router.push(`/room/${newRoomId}?name=${name}&host=true`);
  };

  const joinRoom = () => {
    if (!name || !roomId) {
      setError("Please enter your name and room ID");
      return;
    }
    router.push(`/room/${roomId}?name=${name}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-white">Video Call App</h1>
        {error && (
          <div className="bg-red-500 text-white p-2 rounded mb-4">{error}</div>
        )}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white"
          />
          <input
            type="text"
            placeholder="Room ID (for joining)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white"
          />
          <div className="flex gap-4">
            <button
              onClick={createRoom}
              className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            >
              Create Room
            </button>
            <button
              onClick={joinRoom}
              className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
