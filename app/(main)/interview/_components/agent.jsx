"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { interviewerPromptTemplate } from "@/constants/interview";
import { createVoiceFeedback } from "@/actions/interview";
import { Mic, MicOff, PhoneOff, Phone, Loader2 } from "lucide-react";

const CallStatus = {
  INACTIVE: "INACTIVE",
  CONNECTING: "CONNECTING",
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
};

const Agent = ({
  userName,
  userImageUrl,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  role,
  level,
  techstack,
}) => {
  const router = useRouter();
  const roomRef = useRef(null);
  const remoteAudioContainerRef = useRef(null);
  const processedSegmentIdsRef = useRef(new Set());

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState(CallStatus.INACTIVE);
  const [messages, setMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  const appendTranscriptMessage = (role, content) => {
    const cleaned = content.trim();
    if (!cleaned) return;
    setMessages((prev) => [...prev, { role, content: cleaned }]);
  };

  const inferRoleFromParticipant = (room, participant) => {
    if (!participant) return "assistant";
    return participant.identity === room.localParticipant.identity ? "user" : "assistant";
  };

  const registerRoomListeners = (room) => {
    room.on(RoomEvent.Connected, () => setCallStatus(CallStatus.ACTIVE));

    room.on(RoomEvent.Disconnected, () => {
      setCallStatus((current) =>
        current === CallStatus.FINISHED ? current : CallStatus.FINISHED
      );
      setIsSpeaking(false);
      if (remoteAudioContainerRef.current) remoteAudioContainerRef.current.innerHTML = "";
    });

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (!remoteAudioContainerRef.current) return;
      const attached = track.attach();
      attached.setAttribute("playsinline", "true");
      attached.autoplay = true;
      remoteAudioContainerRef.current.appendChild(attached);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      track.detach().forEach((el) => el.remove());
    });

    room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      const role = inferRoleFromParticipant(room, participant);
      for (const segment of segments) {
        if (!segment.final) continue;
        if (processedSegmentIdsRef.current.has(segment.id)) continue;
        processedSegmentIdsRef.current.add(segment.id);
        appendTranscriptMessage(role, segment.text);
      }
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const localIdentity = room.localParticipant.identity;
      setIsSpeaking(speakers.some((s) => s.identity !== localIdentity));
    });

    room.on(RoomEvent.DataReceived, (payload) => {
      try {
        const text = new TextDecoder().decode(payload);
        const parsed = JSON.parse(text);
        if (parsed.type === "transcript" && parsed.final !== false && parsed.content) {
          appendTranscriptMessage(parsed.role ?? "assistant", parsed.content);
        }
        if (parsed.event === "session-ended") {
          setCallStatus(CallStatus.FINISHED);
          room.disconnect();
        }
      } catch {
        // ignore non-JSON
      }
    });

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (state === "disconnected") {
        setCallStatus((current) =>
          current === CallStatus.FINISHED ? current : CallStatus.FINISHED
        );
      }
    });
  };

  const cleanupRoom = () => {
    if (!roomRef.current) return;
    roomRef.current.disconnect();
    roomRef.current.removeAllListeners();
    roomRef.current = null;
    setIsSpeaking(false);
    if (remoteAudioContainerRef.current) remoteAudioContainerRef.current.innerHTML = "";
  };

  useEffect(() => () => cleanupRoom(), []);

  const handleGenerateFeedback = async (msgs) => {
    const { success, feedbackId: id } = await createVoiceFeedback({
      interviewId,
      userId,
      transcript: msgs,
      feedbackId,
    });
    if (success && id) {
      router.push(`/interview/voice/${interviewId}/feedback`);
    } else {
      router.push("/interview/voice");
    }
  };

  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/interview/voice");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    try {
      setCallStatus(CallStatus.CONNECTING);
      processedSegmentIdsRef.current.clear();
      setMessages([]);

      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, userName, userId, interviewId, questions, role, level, techstack }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Failed to initialize LiveKit session");
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      registerRoomListeners(room);
      roomRef.current = room;

      await room.connect(payload.data.url, payload.data.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      if (type === "generate") {
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ type: "generate-context", role: "system", userName, userId })),
          { reliable: true, topic: "generate-context" }
        );
      } else {
        const formattedQuestions = questions ? questions.map((q) => `- ${q}`).join("\n") : "";
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({
            type: "interview-context",
            role: "system",
            content: interviewerPromptTemplate.replace("{{questions}}", formattedQuestions),
            questions: questions ?? [],
            userName,
            userId,
            interviewId,
          })),
          { reliable: true, topic: "interview-context" }
        );
      }
    } catch (error) {
      console.error("Error starting LiveKit call", error);
      cleanupRoom();
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = async () => {
    setCallStatus(CallStatus.FINISHED);
    cleanupRoom();
  };

  const toggleMute = async () => {
    if (!roomRef.current) return;
    const enabled = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!enabled);
    setIsMuted(enabled);
  };

  const lastMessage = messages[messages.length - 1]?.content;
  const isActive = callStatus === CallStatus.ACTIVE;
  const isConnecting = callStatus === CallStatus.CONNECTING;

  const aiStatus = isActive
    ? isSpeaking ? "Speaking…" : "Listening…"
    : isConnecting ? "Connecting…" : "Ready";

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* ── Avatar cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* AI card */}
        <div className={cn(
          "relative flex flex-col items-center justify-center gap-5 p-10 min-h-[420px] rounded-3xl border transition-all duration-500 overflow-hidden",
          "bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#0d0d1a]",
          isSpeaking
            ? "border-violet-500/60 shadow-[0_0_40px_rgba(139,92,246,0.25)]"
            : "border-white/10"
        )}>
          {/* Ambient glow */}
          <div className={cn(
            "absolute inset-0 rounded-3xl transition-opacity duration-700 pointer-events-none",
            "bg-radial-gradient from-violet-600/10 to-transparent",
            isSpeaking ? "opacity-100" : "opacity-0"
          )} />

          {/* Speaking ring */}
          {isSpeaking && (
            <span className="absolute inline-flex size-[168px] rounded-full border-2 border-violet-400/40 animate-ping opacity-60 pointer-events-none" />
          )}

          {/* AI avatar */}
          <div className={cn(
            "relative size-32 rounded-full ring-4 transition-all duration-500 overflow-hidden",
            isSpeaking ? "ring-violet-500/70 shadow-[0_0_30px_rgba(139,92,246,0.5)]" : "ring-white/10"
          )}>
            <Image
              src="/ai.png"
              alt="AI Interviewer"
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="text-center z-10">
            <h3 className="text-lg font-bold text-white">AI Interviewer</h3>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              {isActive ? (
                <>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isSpeaking ? "bg-violet-400 animate-bounce" : "bg-green-400"
                  )} />
                  <span className="text-sm text-muted-foreground">{aiStatus}</span>
                </>
              ) : isConnecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin" />
                  <span className="text-sm text-muted-foreground">Connecting…</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ready</span>
                </>
              )}
            </div>
          </div>

          {/* Active border pulse */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-3xl border-2 border-violet-500/50 animate-pulse pointer-events-none" />
          )}
        </div>

        {/* User card */}
        <div className="relative flex flex-col items-center justify-center gap-5 p-10 min-h-[420px] rounded-3xl border border-white/10 bg-gradient-to-br from-[#111318] via-[#161a20] to-[#0d0f13] overflow-hidden">
          {/* Subtle ambient */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />

          {/* User avatar */}
          <div className="relative size-32 rounded-full ring-4 ring-white/10 overflow-hidden shadow-xl">
            {userImageUrl ? (
              <Image
                src={userImageUrl}
                alt={userName}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10 text-white text-4xl font-bold">
                {userName?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
            )}
          </div>

          <div className="text-center z-10">
            <h3 className="text-lg font-bold text-white">{userName}</h3>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              {isMuted ? (
                <>
                  <MicOff className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-sm text-red-400">Muted</span>
                </>
              ) : (
                <>
                  <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-green-400 animate-pulse" : "bg-muted-foreground")} />
                  <span className="text-sm text-muted-foreground">{isActive ? "Mic on" : "Waiting"}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Transcript ──────────────────────────────────────────────── */}
      {messages.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] px-6 py-4 min-h-14">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
            {messages[messages.length - 1]?.role === "user" ? "You" : "AI Interviewer"}
          </p>
          <p className="text-sm text-white leading-relaxed animate-fadeIn">
            {lastMessage}
          </p>
        </div>
      )}

      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        {/* Mute toggle — only when active */}
        {isActive && (
          <button
            onClick={toggleMute}
            className={cn(
              "h-12 w-12 rounded-full border flex items-center justify-center transition-all duration-200",
              isMuted
                ? "bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25"
                : "bg-white/5 border-white/15 text-white hover:bg-white/10"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}

        {/* Start / End call */}
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            onClick={handleCall}
            disabled={isConnecting}
            className="relative inline-flex items-center justify-center gap-2 px-10 py-3.5 font-bold text-sm text-white bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-full shadow-lg shadow-green-500/20 transition-all duration-200 min-w-40 disabled:opacity-60"
          >
            {isConnecting && (
              <span className="absolute animate-ping rounded-full inset-0 bg-green-400 opacity-30" />
            )}
            {isConnecting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
              : <><Phone className="h-4 w-4" /> Start Call</>
            }
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center justify-center gap-2 px-10 py-3.5 font-bold text-sm text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-full shadow-lg shadow-red-500/20 transition-all duration-200 min-w-40"
          >
            <PhoneOff className="h-4 w-4" />
            End Call
          </button>
        )}
      </div>

      {/* Hidden audio */}
      <div ref={remoteAudioContainerRef} className="hidden" aria-hidden="true" />
    </div>
  );
};

export default Agent;
