import { memo, useCallback, useMemo } from "react";

export const ConnectionsModal = memo(
  ({
    connections,
    localPeerId,
    muteUser,
    unmuteUser,
    kickUser,
    broadcast,
    currentRoomState,
  }) => {
    const isRemoteUserMuted = useCallback(
      (peerId) => {
        if (currentRoomState?.metadata?.mutedUsers?.includes(peerId)) {
          return true;
        } else {
          return false;
        }
      },
      [currentRoomState]
    );

    return (
      <div className="flex items-center justify-center w-full bottom-[40%] absolute">
        <div className="px-10 py-2 bg-white rounded shadow-lg max-w-[50%] w-full max-h-[50%] h-full">
          <ul className="flex flex-col gap-4 overflow-y-scroll">
            {connections.map(([peerId, stream]) => {
              if (peerId === localPeerId) return;
              return (
                <li
                  key={peerId}
                  className="flex flex-row items-center justify-between gap-8"
                >
                  <span className="text-black text-nowrap">{peerId}</span>
                  <div className="flex flex-row gap-2">
                    <button
                      onClick={() => {
                        if (isRemoteUserMuted(peerId)) {
                          unmuteUser(peerId);
                        } else {
                          muteUser(peerId);
                        }
                      }}
                      className="text-white bg-blue-500 px-2 py-1 rounded"
                    >
                      {isRemoteUserMuted(peerId) ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={() => {
                        kickUser(peerId);
                      }}
                      className="px-2 py-1 bg-red-500 text-white rounded"
                    >
                      Kick
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
);
