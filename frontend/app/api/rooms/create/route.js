import { roomManager } from "@/lib/room-manager";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { roomId, password, creatorPeerId } = await req.json();

    try {
      const room = roomManager.createRoom(roomId, password, creatorPeerId);
      return NextResponse.json({
        success: true,
        room: room.toJSON(),
      });
    } catch (error) {
      if (error.message === "Room already exists") {
        return NextResponse.json(
          { error: "Room already exists" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
