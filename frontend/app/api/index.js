import { NextResponse } from "next/server";

const roomManager = global.roomManager || new RoomManager();

if (process.env.NODE_ENV !== "production") {
  global.roomManager = roomManager;
}

export async function GET(req) {
  return NextResponse.json(roomManager.getAllRooms());
}
