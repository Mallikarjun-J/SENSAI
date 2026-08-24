import { randomUUID } from "node:crypto";
import {
  AccessToken,
  AgentDispatchClient,
  RoomServiceClient,
  TwirpError,
} from "livekit-server-sdk";

const getEnv = (name) => process.env[name]?.trim();

const toApiHost = (url) => {
  if (url.startsWith("wss://")) return url.replace("wss://", "https://");
  if (url.startsWith("ws://")) return url.replace("ws://", "http://");
  return url;
};

export async function POST(request) {
  const apiKey = getEnv("LIVEKIT_API_KEY");
  const apiSecret = getEnv("LIVEKIT_API_SECRET");
  const liveKitUrl = getEnv("NEXT_PUBLIC_LIVEKIT_URL") || getEnv("LIVEKIT_URL");
  const liveKitAgentName = getEnv("LIVEKIT_AGENT_NAME");
  const liveKitApiHost = liveKitUrl ? toApiHost(liveKitUrl) : undefined;

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
    const { type, userName, userId, interviewId, questions, role, level, techstack } = body;

    const sessionMetadata = JSON.stringify({
      mode: type,
      interviewId: interviewId ?? null,
      questions: questions ?? [],
      userId: userId ?? null,
      userName: userName ?? null,
      role: role ?? null,
      level: level ?? null,
      techstack: techstack ?? [],
    });

    const roomName =
      type === "interview" && interviewId
        ? `interview-${interviewId}`
        : `generate-${userId ?? "guest"}-${randomUUID()}`;

    const identity = userId ? `${userId}-${Date.now()}` : `guest-${Date.now()}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: userName ?? "Candidate",
      metadata: sessionMetadata,
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    if (liveKitAgentName && liveKitApiHost) {
      const roomClient = new RoomServiceClient(liveKitApiHost, apiKey, apiSecret);

      try {
        await roomClient.createRoom({ name: roomName, metadata: sessionMetadata });
      } catch (error) {
        if (!(error instanceof TwirpError) || error.code !== "already_exists") {
          throw error;
        }
        await roomClient.updateRoomMetadata(roomName, sessionMetadata);
      }

      const dispatchClient = new AgentDispatchClient(liveKitApiHost, apiKey, apiSecret);
      let existingDispatches = [];

      try {
        existingDispatches = await dispatchClient.listDispatch(roomName);
      } catch (error) {
        if (!(error instanceof TwirpError) || error.code !== "not_found") {
          throw error;
        }
      }

      const alreadyDispatched = existingDispatches.some(
        (dispatch) => dispatch.agentName === liveKitAgentName
      );

      if (!alreadyDispatched) {
        await dispatchClient.createDispatch(roomName, liveKitAgentName, {
          metadata: JSON.stringify({
            type,
            interviewId: interviewId ?? null,
            questions: questions ?? [],
            userId: userId ?? null,
            userName: userName ?? null,
            role: role ?? null,
            level: level ?? null,
            techstack: techstack ?? [],
          }),
        });
      }
    }

    return Response.json(
      {
        success: true,
        data: {
          token: await token.toJwt(),
          url: liveKitUrl,
          roomName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to create LiveKit token", error);
    return Response.json(
      { success: false, error: "Unable to create LiveKit token" },
      { status: 500 }
    );
  }
}
