"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { interviewerPromptTemplate } from "@/constants/interview";
import { createVoiceFeedback } from "@/actions/interview";
import { Mic, MicOff, PhoneOff, Phone, Loader2, VideoOff } from "lucide-react";

const CallStatus = {
  INACTIVE:   "INACTIVE",
  CONNECTING: "CONNECTING",
  ACTIVE:     "ACTIVE",
  FINISHED:   "FINISHED",
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
  const roomRef                 = useRef(null);
  const remoteAudioContainerRef = useRef(null);
  const processedSegmentIdsRef  = useRef(new Set());
  const videoRef                = useRef(null);   // <video> for webcam
  const cameraStreamRef         = useRef(null);   // MediaStream for cleanup
  const roomNameRef             = useRef(null);   // Active LiveKit room name for deletion

  const [isSpeaking,         setIsSpeaking]         = useState(false);
  const [callStatus,         setCallStatus]         = useState(CallStatus.INACTIVE);
  const [messages,           setMessages]           = useState([]);
  const [isMuted,            setIsMuted]            = useState(false);
  const [cameraOn,           setCameraOn]           = useState(false);
  const [liveText,           setLiveText]           = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStep,         setReportStep]         = useState(0);

  /* ── Camera: start immediately on mount ─────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        cameraStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOn(true);
      } catch {
        setCameraOn(false);
      }
    })();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ── Auto-advance report steps ──────────────────────────────────────────── */
  useEffect(() => {
    if (!isGeneratingReport) return;
    const STEPS = [0, 1, 2, 3];
    const timers = STEPS.map((step) =>
      setTimeout(() => setReportStep(step), step * 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [isGeneratingReport]);

  /* ── Attach stream when videoRef mounts after cameraOn=true ─────────── */
  useEffect(() => {
    if (cameraOn && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraOn]);

  /* ── Transcript helpers ─────────────────────────────────────────────── */
  const appendTranscriptMessage = (role, content) => {
    const cleaned = content.trim();
    if (!cleaned) return;
    setMessages((prev) => [...prev, { role, content: cleaned }]);
  };

  const inferRoleFromParticipant = (room, participant) => {
    if (!participant) return "assistant";
    return participant.identity === room.localParticipant.identity ? "user" : "assistant";
  };

  /* ── LiveKit room listeners ─────────────────────────────────────────── */
  const registerRoomListeners = (room) => {
    room.on(RoomEvent.Connected, () => {
      setCallStatus(CallStatus.ACTIVE);
    });

    room.on(RoomEvent.Disconnected, () => {
      setCallStatus((current) =>
        current === CallStatus.FINISHED ? current : CallStatus.FINISHED
      );
      setIsSpeaking(false);
      if (remoteAudioContainerRef.current) remoteAudioContainerRef.current.innerHTML = "";
    });

    room.on(RoomEvent.ParticipantConnected, (_participant) => {
    });

    room.on(RoomEvent.ParticipantDisconnected, (_participant) => {
    });

    room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (!remoteAudioContainerRef.current) return;
      const el = track.attach();
      el.setAttribute("playsinline", "true");
      el.autoplay = true;
      el.muted = false;
      el.volume = 1.0;
      remoteAudioContainerRef.current.appendChild(el);
      el.play().catch(() => {});
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      track.detach().forEach((el) => el.remove());
    });

    room.on(RoomEvent.TrackPublished, (_pub, _participant) => {
    });

    room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      const role = inferRoleFromParticipant(room, participant);
      for (const segment of segments) {
        if (role === "assistant") {
          if (!segment.final) {
            setLiveText(segment.text);
          } else {
            if (processedSegmentIdsRef.current.has(segment.id)) continue;
            processedSegmentIdsRef.current.add(segment.id);
            setLiveText("");
            appendTranscriptMessage(role, segment.text);
          }
        } else {
          if (!segment.final) continue;
          if (processedSegmentIdsRef.current.has(segment.id)) continue;
          processedSegmentIdsRef.current.add(segment.id);
          appendTranscriptMessage(role, segment.text);
        }
      }
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const localIdentity = room.localParticipant.identity;
      setIsSpeaking(speakers.some((s) => s.identity !== localIdentity));
    });

    room.on(RoomEvent.DataReceived, (payload) => {
      try {
        const text   = new TextDecoder().decode(payload);
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

  /* ── Room cleanup ───────────────────────────────────────────────────── */
  const cleanupRoom = () => {
    // 1. Tell server to immediately destroy the LiveKit room so the AI agent stops instantly
    const roomToClose = roomNameRef.current;
    if (roomToClose) {
      roomNameRef.current = null;
      try {
        fetch("/api/livekit/end-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: roomToClose }),
          keepalive: true, // Guarantees execution even during tab close or page navigation
        }).catch(() => {});
      } catch {}
    }

    // 2. Stop local webcam stream and release hardware camera
    if (cameraStreamRef.current) {
      try {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      cameraStreamRef.current = null;
    }

    // 3. Stop local audio tracks and disconnect LiveKit session
    if (roomRef.current) {
      try {
        roomRef.current.localParticipant?.trackPublications?.forEach((pub) => {
          try {
            pub.track?.stop();
          } catch {}
        });
        roomRef.current.disconnect();
        roomRef.current.removeAllListeners();
      } catch (err) {
        console.error("Error disconnecting room:", err);
      }
      roomRef.current = null;
    }

    setIsSpeaking(false);
    setCameraOn(false);
    if (remoteAudioContainerRef.current) remoteAudioContainerRef.current.innerHTML = "";
  };

  useEffect(() => {
    const handleLeave = () => {
      cleanupRoom();
    };

    window.addEventListener("beforeunload", handleLeave);
    window.addEventListener("pagehide", handleLeave);
    window.addEventListener("popstate", handleLeave);

    return () => {
      window.removeEventListener("beforeunload", handleLeave);
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("popstate", handleLeave);
      cleanupRoom();
    };
  }, []);

  /* ── Feedback + navigation ──────────────────────────────────────────── */
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
        setIsGeneratingReport(true);
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  /* ── Call handlers ──────────────────────────────────────────────────── */
  const handleCall = async () => {
    try {
      setCallStatus(CallStatus.CONNECTING);
      processedSegmentIdsRef.current.clear();
      setMessages([]);

      const response = await fetch("/api/livekit/token", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type, interviewId, questions, role, level, techstack }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Failed to initialize LiveKit session");
      }

      roomNameRef.current = payload.data.roomName;

      const room = new Room({ adaptiveStream: false, dynacast: false });
      registerRoomListeners(room);
      roomRef.current = room;

      await room.connect(payload.data.url, payload.data.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      // Attach any audio tracks already in the room (agent may have joined before us)
      const attachAudio = (track) => {
        if (!remoteAudioContainerRef.current) return;
        const el = track.attach();
        el.setAttribute("playsinline", "true");
        el.autoplay = true;
        el.muted = false;
        el.volume = 1.0;
        remoteAudioContainerRef.current.appendChild(el);
        el.play().catch(() => {});
      };

      for (const participant of room.remoteParticipants.values()) {
        for (const pub of participant.trackPublications.values()) {
          if (pub.track && pub.track.kind === Track.Kind.Audio) {
            attachAudio(pub.track);
          }
        }
      }

      if (type === "generate") {
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ type: "generate-context", role: "system", userName, userId })),
          { reliable: true, topic: "generate-context" }
        );
      } else {
        const formattedQuestions = questions ? questions.map((q) => `- ${q}`).join("\n") : "";
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({
            type:        "interview-context",
            role:        "system",
            content:     interviewerPromptTemplate.replace("{{questions}}", formattedQuestions),
            questions:   questions ?? [],
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

  /* ── Derived state ──────────────────────────────────────────────────── */
  const isActive     = callStatus === CallStatus.ACTIVE;
  const isConnecting = callStatus === CallStatus.CONNECTING;

  // Last completed AI sentence (for when liveText is empty between turns)
  const lastAIMessage = [...messages].reverse().find((m) => m.role === "assistant")?.content;
  // Left panel text: prefer streaming liveText, fall back to last completed AI message
  const displayText   = liveText || lastAIMessage;

  const aiStatus = isActive
    ? isSpeaking ? "Speaking…" : "Listening…"
    : isConnecting ? "Connecting…" : "Ready";

  /* ── Render ─────────────────────────────────────────────────────────────── */

  /* ── Report generation loading screen ──────────────────────────────────── */
  if (isGeneratingReport) {
    const steps = [
      "Transcribing your interview",
      "Evaluating your responses",
      "Writing category feedback",
      "Finalising your report",
    ];

    const currentStepLabel = steps[Math.min(reportStep, steps.length - 1)];

    return (
      <div className="flex items-center justify-center min-h-[500px] w-full px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          {/* Glowing purple orb spinner */}
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-ping scale-150 opacity-30" />
            <div className="absolute inset-2 bg-purple-500/5 rounded-full animate-pulse" />
            <div className="relative w-28 h-28 bg-gradient-to-br from-purple-600 to-violet-700 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/20">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          </div>

          {/* Heading & active step */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Analyzing your interview
            </h2>
            <p className="text-sm text-muted-foreground min-h-[20px] transition-all duration-500">
              {currentStepLabel}…
            </p>
          </div>

          {/* Progress dots / pills */}
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === reportStep ? "w-8 bg-purple-400 shadow-sm shadow-purple-400/50" : "w-1.5 bg-white/10"
                )}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Usually takes 15–30 seconds
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* ── Two-panel grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* LEFT — AI panel: avatar before call, live transcript during call */}
        <div className={cn(
          "relative flex flex-col items-center justify-center gap-4 p-5 sm:p-10 min-h-[220px] sm:min-h-[420px] rounded-3xl border transition-all duration-500 overflow-hidden",
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
            <span className="absolute inline-flex size-[100px] sm:size-[168px] rounded-full border-2 border-violet-400/40 animate-ping opacity-60 pointer-events-none" />
          )}

          {/* Content area */}
          {!isActive ? (
            /* Before call — show AI avatar */
            <div className={cn(
              "relative size-24 sm:size-32 rounded-full ring-4 transition-all duration-500 overflow-hidden",
              "ring-white/10"
            )}>
              <Image src="/ai.png" alt="AI Interviewer" fill className="object-cover" priority />
            </div>
          ) : (
            /* During call — show latest AI message */
            <div className="z-10 w-full px-2 text-center">
              {displayText ? (
                <p className="text-white text-sm sm:text-base leading-relaxed font-medium">
                  {displayText}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Waiting for first question…
                </p>
              )}
            </div>
          )}

          {/* Name + status */}
          <div className="text-center z-10">
            <h3 className="text-base sm:text-lg font-bold text-white">AI Interviewer</h3>
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

          {/* Border pulse when speaking */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-3xl border-2 border-violet-500/50 animate-pulse pointer-events-none" />
          )}
        </div>

        {/* RIGHT — User panel: live webcam or avatar fallback */}
        <div className="relative flex flex-col items-center justify-center gap-4 p-5 sm:p-10 min-h-[220px] sm:min-h-[420px] rounded-3xl border border-white/10 bg-gradient-to-br from-[#111318] via-[#161a20] to-[#0d0f13] overflow-hidden">

          {cameraOn ? (
            /* ── Live webcam ── */
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover rounded-3xl"
              />
              {/* Name + mic status overlay at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-3xl flex items-center justify-between z-10">
                <h3 className="text-sm font-bold text-white">{userName}</h3>
                <div className="flex items-center gap-1.5">
                  {isMuted ? (
                    <>
                      <MicOff className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-xs text-red-400">Muted</span>
                    </>
                  ) : (
                    <>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isActive ? "bg-green-400 animate-pulse" : "bg-muted-foreground"
                      )} />
                      <span className="text-xs text-muted-foreground">
                        {isActive ? "Mic on" : "Waiting"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ── Fallback: avatar ── */
            <>
              {/* Subtle ambient */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />

              <div className="relative size-24 sm:size-32 rounded-full ring-4 ring-white/10 overflow-hidden shadow-xl">
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
                <h3 className="text-base sm:text-lg font-bold text-white">{userName}</h3>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  {isMuted ? (
                    <>
                      <MicOff className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-sm text-red-400">Muted</span>
                    </>
                  ) : (
                    <>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isActive ? "bg-green-400 animate-pulse" : "bg-muted-foreground"
                      )} />
                      <span className="text-sm text-muted-foreground">
                        {isActive ? "Mic on" : "Waiting"}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <VideoOff className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Camera unavailable</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        {/* Mute — only when active */}
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

      {/* Hidden audio output for AI voice — use sr-only not hidden, display:none can suppress audio */}
      <div
        ref={remoteAudioContainerRef}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
};

export default Agent;
