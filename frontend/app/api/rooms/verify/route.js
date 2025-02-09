import { roomManager } from "@/lib/room-manager";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { roomId, password } = await req.json();

    try {
      const room = roomManager.verifyRoom(roomId, password);
      return NextResponse.json({
        success: true,
        room: room.toJSON(),
      });
    } catch (error) {
      if (error.message === "Room not found") {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      if (error.message === "Invalid password") {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
