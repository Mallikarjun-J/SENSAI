import { RoomServiceClient } from "livekit-server-sdk";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const getEnv = (name) => process.env[name]?.trim();

const toApiHost = (url) => {
  if (url.startsWith("wss://")) return url.replace("wss://", "https://");
  if (url.startsWith("ws://"))  return url.replace("ws://", "http://");
  return url;
};

export async function POST(request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Resolve the DB user so we have an internal userId for ownership checks
  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!dbUser) {
    return Response.json({ success: false, error: "User not found" }, { status: 401 });
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

    // ── F-010: Authorization — verify this room belongs to the calling user ──
    // The token route creates room names in one of two formats:
    //   interview-{interviewId}-{timestamp}   (for voice interview sessions)
    //   generate-{dbUserId}-{uuid}            (for question-generation sessions)
    //
    // For interview rooms: look up the interview in the DB and confirm ownership.
    // For generate rooms:  the userId segment must match the caller's DB user id.
    const interviewMatch = roomName.match(/^interview-([^-]+(?:-[^-]+)*)-\d+$/);
    const generateMatch  = roomName.match(/^generate-([^-]+)-/);

    if (interviewMatch) {
      // interviewId is everything between "interview-" and the trailing "-{timestamp}"
      // However the interviewId itself may contain hyphens (CUID format).
      // A simpler approach: strip the trailing "-{digits}" suffix.
      const withoutPrefix = roomName.replace(/^interview-/, "");
      const interviewId   = withoutPrefix.replace(/-\d+$/, "");

      const interview = await prisma.interview.findFirst({
        where: { id: interviewId, userId: dbUser.id },
        select: { id: true },
      });
      if (!interview) {
        return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else if (generateMatch) {
      const embeddedUserId = generateMatch[1];
      if (embeddedUserId !== dbUser.id) {
        return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Unknown room name format — deny by default
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    // ── End F-010 ─────────────────────────────────────────────────────────────

    const roomClient = new RoomServiceClient(liveKitApiHost, apiKey, apiSecret);
    await roomClient.deleteRoom(roomName);

    return Response.json({ success: true, message: "Room closed successfully" });
  } catch (err) {
    // If room is already closed or does not exist, treat as success
    return Response.json({ success: true, message: "Room already closed or deleted" });
  }
}
