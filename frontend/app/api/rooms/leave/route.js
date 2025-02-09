import { roomManager } from "@/lib/room-manager";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { roomId, peerId } = await req.json();

    roomManager.leaveRoom(roomId, peerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
