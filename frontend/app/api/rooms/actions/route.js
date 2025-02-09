import { roomManager } from "@/lib/room-manager";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { roomId, action, targetPeerId, adminPeerId, targetSessionId } =
      await req.json();
    const room = roomManager.rooms.get(roomId);

    if (!room) {
      throw new Error("Room not found");
    }

    switch (action) {
      case "mute":
        room.muteUser(targetPeerId, adminPeerId);
        break;
      case "unmute":
        room.unmuteUser(targetPeerId, adminPeerId);
        break;
      case "kick":
        room.kickUser(targetPeerId, adminPeerId, targetSessionId);
        break;
      case "lock":
        room.lockRoom(adminPeerId);
        break;
      case "unlock":
        room.unlockRoom(adminPeerId);
        break;
      default:
        throw new Error("Invalid action");
    }

    return NextResponse.json({
      success: true,
      room: room.toJSON(),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
