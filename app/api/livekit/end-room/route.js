import { RoomServiceClient } from "livekit-server-sdk";
import { auth } from "@clerk/nextjs/server";

const getEnv = (name) => process.env[name]?.trim();

const toApiHost = (url) => {
  if (url.startsWith("wss://")) return url.replace("wss://", "https://");
  if (url.startsWith("ws://"))  return url.replace("ws://", "http://");
  return url;
};

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const apiKey     = getEnv("LIVEKIT_API_KEY");
  const apiSecret  = getEnv("LIVEKIT_API_SECRET");
  const liveKitUrl = getEnv("NEXT_PUBLIC_LIVEKIT_URL") || getEnv("LIVEKIT_URL");
  const liveKitApiHost = liveKitUrl ? toApiHost(liveKitUrl) : undefined;

  if (!apiKey || !apiSecret || !liveKitApiHost) {
    return Response.json(
      { success: false, error: "Missing LiveKit configuration" },
      { status: 500 }
    );
  }

  try {
    const { roomName } = await request.json();
    if (!roomName) {
      return Response.json(
        { success: false, error: "Room name is required" },
        { status: 400 }
      );
    }

    const roomClient = new RoomServiceClient(liveKitApiHost, apiKey, apiSecret);
    await roomClient.deleteRoom(roomName);

    return Response.json({ success: true, message: "Room closed successfully" });
  } catch (err) {
    // If room is already closed or does not exist, treat as success
    return Response.json({ success: true, message: "Room already closed or deleted" });
  }
}
