import asyncio
import json
import logging
import os
from typing import Any

from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    inference,
    room_io,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

# --------------------------------------------------
# CONFIG
# --------------------------------------------------

logger = logging.getLogger("SensAIInterviewAgent")

load_dotenv(".env.local")


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def _safe_json_loads(raw: str | None) -> dict[str, Any]:
    """Safely parse a JSON string. Returns empty dict on failure."""
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _extract_questions(metadata: dict[str, Any]) -> list[str]:
    """Extract the questions list from metadata."""
    questions = metadata.get("questions")
    if isinstance(questions, list):
        return [str(q).strip() for q in questions if str(q).strip()]
    return []


# --------------------------------------------------
# AGENT
# --------------------------------------------------

class InterviewPrepAgent(Agent):
    """
    Conducts a structured mock interview for SensAI.

    The LLM drives the ENTIRE conversation — asking questions, acknowledging
    answers, and deciding when to move on — based on its system instructions.
    Auto-end is handled by the entrypoint via session-level speech events.
    """

    def __init__(
        self,
        questions: list[str],
        user_name: str,
        role: str,
        level: str,
        techstack: list[str],
        room: rtc.Room,
    ) -> None:
        # ----------------------------------------------------------------
        # STRICT RULES appended to every prompt variant.
        # These override any default LLM "helpfulness" behaviour.
        # ----------------------------------------------------------------
        strict_rules = (
            "\n\nABSOLUTE RULES — never break these under any circumstances:\n"
            "- You are the INTERVIEWER. You ask questions. You do NOT answer them.\n"
            "- NEVER provide answers, hints, solutions, example code, correct responses,\n"
            "  or any guidance on how to answer an interview question.\n"
            "- NEVER evaluate whether the candidate's answer is correct or incorrect.\n"
            "- If the candidate asks you for the answer or a hint, politely decline and\n"
            "  encourage them to answer based on their own knowledge.\n"
            "  Example: 'I am not able to provide answers — this is your chance to show\n"
            "  what you know. Please share your thoughts.'\n"
            "- After the candidate answers (even partially), give a neutral, brief\n"
            "  acknowledgment only (e.g. 'Thank you', 'Got it', 'Understood') and then\n"
            "  move to the next question. Do NOT comment on quality or correctness.\n"
        )

        if questions:
            numbered = "\n".join(f"{i + 1}. {q}" for i, q in enumerate(questions))
            full_instructions = (
                f"You are a professional job interviewer conducting a real voice interview with {user_name}.\n"
                "Speak at a calm, natural conversational pace. "
                "Do NOT use markdown, bullet points, or special characters.\n\n"
                f"You have exactly {len(questions)} questions to ask, in this exact order:\n"
                f"{numbered}\n\n"
                "Rules you MUST follow:\n"
                "1. Ask questions ONE AT A TIME. Wait for the candidate to fully finish speaking.\n"
                "2. After each answer, give a brief neutral acknowledgment (1 short sentence ONLY — e.g. 'Thank you for that.'), then ask the next question.\n"
                "3. Do NOT skip questions. Do NOT ask extra questions beyond the list.\n"
                "4. Do NOT comment on whether answers are right, wrong, good, or bad.\n"
                "5. After the candidate answers the LAST question, thank them warmly and say goodbye.\n"
                "6. At the very end of your closing message — after thanking them — say exactly the phrase: interview complete.\n"
                "   Example closing: 'Thank you so much for your time today. We will be in touch soon. Interview complete.'\n"
                "7. Do NOT say 'interview complete' at any other point in the conversation.\n"
            ) + strict_rules
        else:
            tech_str = ", ".join(techstack) if techstack else "relevant technologies"
            full_instructions = (
                f"You are a professional job interviewer conducting a real {level} {role} voice interview with {user_name}.\n"
                "Speak at a calm, natural conversational pace. "
                "Do NOT use markdown, bullet points, or special characters.\n\n"
                f"The candidate is applying for a {level}-level {role} role using: {tech_str}.\n"
                "Ask exactly 5 relevant interview questions for this role, ONE AT A TIME.\n"
                "After each answer, give a brief neutral acknowledgment only, then ask the next question.\n"
                "Do NOT comment on whether answers are right or wrong.\n"
                "After the 5th answer, thank them warmly and say goodbye.\n"
                "At the very end of your closing message say exactly: interview complete.\n"
            ) + strict_rules

        super().__init__(instructions=full_instructions)
        self._room = room
        self._ended = False
        self._answer_count = 0
        self._total_questions = len(questions)

    # --------------------------------------------------
    # Lifecycle
    # --------------------------------------------------

    async def on_enter(self) -> None:
        """Kick off the interview — LLM drives everything after this."""
        logger.info("Interview agent entering session.")
        await self.session.generate_reply(
            instructions=(
                f"Greet {self._room.name.split('-')[0] if self._room.name else 'the candidate'} "
                "warmly and professionally, then immediately ask Question 1."
            ),
            allow_interruptions=True,
        )

    async def on_user_turn_completed(self, turn_ctx: Any, new_message: Any) -> None:  # type: ignore[override]
        """
        BACKUP end-of-interview detection only.
        This fires for EVERY user utterance (including greetings, filler words,
        short confirmations, etc.) — NOT just question answers. So we use a much
        higher threshold (3x questions + 5 buffer) and a long delay, ensuring the
        primary "interview complete" phrase detection fires first in normal cases.
        This backup only kicks in if the agent somehow never says the phrase.
        """
        self._answer_count += 1
        # Threshold: 3× questions + 5 buffer to account for greetings / filler turns
        backup_threshold = self._total_questions * 3 + 5
        logger.info(
            "User turn %d / backup_threshold %d",
            self._answer_count,
            backup_threshold,
        )
        if self._answer_count >= backup_threshold and not self._ended:
            logger.info("Backup threshold reached — scheduling delayed session end.")
            asyncio.ensure_future(self._delayed_end())

    async def _delayed_end(self) -> None:
        """Long delay gives the LLM plenty of time to say 'interview complete' first."""
        await asyncio.sleep(90)   # 90 s — only fires if primary detection fails
        if not self._ended:
            logger.info("Backup end triggered after 90s delay.")
            await self.end_session()

    # --------------------------------------------------
    # Session termination
    # --------------------------------------------------

    async def end_session(self) -> None:
        """
        Send 'session-ended' to the frontend then disconnect.
        Frontend (agent.jsx) listens for this → setCallStatus(FINISHED)
        → handleGenerateFeedback() → redirects to feedback page.
        """
        if self._ended:
            return
        self._ended = True

        try:
            payload = json.dumps({"event": "session-ended"}).encode("utf-8")
            await self._room.local_participant.publish_data(payload, reliable=True)
            logger.info("Sent session-ended signal to frontend.")
            await asyncio.sleep(1)
        except Exception as e:
            logger.warning("Could not send session-ended signal: %s", e)

        try:
            await self._room.disconnect()
            logger.info("Room disconnected.")
        except Exception as e:
            logger.warning("Error disconnecting room: %s", e)


# --------------------------------------------------
# SERVER
# --------------------------------------------------

server = AgentServer()


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


# --------------------------------------------------
# LIVEKIT ENTRYPOINT
# --------------------------------------------------

@server.rtc_session(agent_name=os.getenv("LIVEKIT_AGENT_NAME", "sensai-interview-agent"))
async def entrypoint(ctx: JobContext) -> None:
    # --- Resolve metadata ---
    job_meta  = _safe_json_loads(getattr(ctx.job, "metadata", None))
    room_meta = _safe_json_loads(ctx.room.metadata)
    merged    = {**room_meta, **job_meta}

    questions     = _extract_questions(merged)
    user_name     = str(merged.get("userName")  or "candidate").strip()
    role          = str(merged.get("role")       or "Software Engineer").strip()
    level         = str(merged.get("level")      or "").strip()
    techstack_raw = merged.get("techstack")
    techstack     = (
        [str(t).strip() for t in techstack_raw if str(t).strip()]
        if isinstance(techstack_raw, list) else []
    )

    logger.info(
        "Session — user=%s, role=%s, level=%s, questions=%d",
        user_name, role, level, len(questions),
    )

    agent = InterviewPrepAgent(
        questions=questions,
        user_name=user_name,
        role=role,
        level=level,
        techstack=techstack,
        room=ctx.room,
    )

    session = AgentSession(
        stt=inference.STT(
            model="deepgram/nova-3",
            language="en",
        ),
        llm=inference.LLM(
            model="openai/gpt-4.1-mini",
        ),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="6ccbfb76-1fc6-48f7-b71d-91ac6298247b",  # Tessa — English US, female
            language="en",
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=False,
    )

    # ------------------------------------------------------------------
    # Auto-end detection.
    # The LLM says exactly "interview complete" at the end of its closing
    # message. We listen for that phrase and trigger session teardown.
    # ------------------------------------------------------------------
    @session.on("agent_speech_committed")
    def on_agent_speech_committed(msg: Any) -> None:
        text = ""
        if isinstance(msg, str):
            text = msg
        elif hasattr(msg, "content"):
            c = msg.content
            if isinstance(c, str):
                text = c
            elif isinstance(c, list):
                text = " ".join(
                    (p.text if hasattr(p, "text") else str(p)) for p in c
                )
        elif hasattr(msg, "text_content"):
            text = str(msg.text_content or "")
        else:
            text = str(msg)

        logger.debug("Agent speech committed: %s", text[:120])

        if "interview complete" in text.lower() and not agent._ended:
            logger.info("Detected 'interview complete' — ending session.")
            asyncio.ensure_future(agent.end_session())

    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )


# --------------------------------------------------
# MAIN
# --------------------------------------------------

if __name__ == "__main__":
    cli.run_app(server)
