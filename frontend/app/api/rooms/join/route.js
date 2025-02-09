import { roomManager } from "@/lib/room-manager";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { roomId, peerId, password, userData } = await req.json();

    const room = roomManager.verifyRoom(roomId, password);
    const roomData = room.addConnection(peerId, userData);

    return NextResponse.json(roomData);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
