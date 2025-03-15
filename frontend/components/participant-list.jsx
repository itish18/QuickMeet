import React from "react";
import { useRoom } from "@/context/room-context";
import { FaMicrophoneSlash, FaBan } from "react-icons/fa";

const ParticipantList = () => {
  const { state, kickParticipant } = useRoom();

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Participants</h2>
      <ul className="space-y-2">
        {Object.values(state.participants).map((participant) => (
          <li
            key={participant.id}
            className="flex items-center justify-between p-2 bg-gray-700 rounded"
          >
            <div className="flex items-center gap-2">
              <span>{participant.name}</span>
              {participant.isHost && (
                <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                  Host
                </span>
              )}
              {!participant.audioEnabled && (
                <FaMicrophoneSlash className="text-red-500" />
              )}
            </div>
            {state.isHost && !participant.isHost && (
              <button
                onClick={() => kickParticipant(participant.id)}
                className="text-red-500 hover:text-red-600"
              >
                <FaBan />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ParticipantList;
