import { randomUUID } from "node:crypto";
import {
  AccessToken,
  AgentDispatchClient,
  RoomServiceClient,
} from "livekit-server-sdk";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const getEnv = (name) => process.env[name]?.trim();

const toApiHost = (url) => {
  if (url.startsWith("wss://")) return url.replace("wss://", "https://");
  if (url.startsWith("ws://"))  return url.replace("ws://", "http://");
  return url;
};

export async function POST(request) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  // userId and userName MUST come from the server session — never from the
  // client body. A client can send any userId it wants; we must ignore it.
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Look up the internal DB user to get the display name
  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, name: true },
  });
  if (!dbUser) {
    return Response.json(
      { success: false, error: "User not found" },
      { status: 401 }
    );
  }

  // Server-authoritative identity — never taken from the request body
  const serverUserId = dbUser.id;
  const serverUserName = dbUser.name ?? "Candidate";

  // ── LiveKit env ────────────────────────────────────────────────────────────
  const apiKey        = getEnv("LIVEKIT_API_KEY");
  const apiSecret     = getEnv("LIVEKIT_API_SECRET");
  const liveKitUrl    = getEnv("NEXT_PUBLIC_LIVEKIT_URL") || getEnv("LIVEKIT_URL");
  const liveKitAgentName = getEnv("LIVEKIT_AGENT_NAME");
  const liveKitApiHost   = liveKitUrl ? toApiHost(liveKitUrl) : undefined;

  if (!apiKey || !apiSecret || !liveKitUrl) {
    return Response.json(
      {
        success: false,
        error:
          "Missing LiveKit environment variables. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Only accept non-identity fields from the client body
    const { type, interviewId, questions, role, level, techstack } = body;

    const sessionMetadata = JSON.stringify({
      mode:        type,
      interviewId: interviewId ?? null,
      questions:   questions   ?? [],
      userId:      serverUserId,       // server-authoritative
      userName:    serverUserName,     // server-authoritative
      role:        role        ?? null,
      level:       level       ?? null,
      techstack:   techstack   ?? [],
    });

    const roomName =
      type === "interview" && interviewId
        ? `interview-${interviewId}-${Date.now()}`
        : `generate-${serverUserId}-${randomUUID()}`;

    // Identity uses the DB user ID — never the client-supplied value
    const identity = `${serverUserId}-${Date.now()}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: serverUserName,
      metadata: sessionMetadata,
    });

    token.addGrant({
      roomJoin:       true,
      room:           roomName,
      canPublish:     true,
      canSubscribe:   true,
      canPublishData: true,
    });

    if (liveKitAgentName && liveKitApiHost) {
      const roomClient = new RoomServiceClient(liveKitApiHost, apiKey, apiSecret);

      try {
        await roomClient.createRoom({
          name: roomName,
          metadata: sessionMetadata,
          emptyTimeout: 15,
        });
      } catch (error) {
        if (!(error instanceof TwirpError) || error.code !== "already_exists") {
          throw error;
        }
        await roomClient.updateRoomMetadata(roomName, sessionMetadata);
      }

      const dispatchClient = new AgentDispatchClient(liveKitApiHost, apiKey, apiSecret);

      await dispatchClient.createDispatch(roomName, liveKitAgentName, {
        metadata: JSON.stringify({
          type,
          interviewId: interviewId ?? null,
          questions:   questions   ?? [],
          userId:      serverUserId,   // server-authoritative
          userName:    serverUserName, // server-authoritative
          role:        role        ?? null,
          level:       level       ?? null,
          techstack:   techstack   ?? [],
        }),
      });
    }

    return Response.json(
      {
        success: true,
        data: {
          token: await token.toJwt(),
          url:   liveKitUrl,
          roomName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to create LiveKit token:", error.message ?? "unknown error");
    return Response.json(
      { success: false, error: "Unable to create LiveKit token" },
      { status: 500 }
    );
  }
}
