import { roomManager } from "@/lib/room-manager";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    const rooms = await roomManager.getAllRooms();

    return NextResponse.json(rooms);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
