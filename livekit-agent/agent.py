import asyncio
import json
import logging
import os
import re
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


logger = logging.getLogger("SensAIInterviewAgent")

load_dotenv(".env.local")


def _safe_json_loads(raw: str | None) -> dict[str, Any]:
    """Safely parse metadata JSON."""
    if not raw:
        return {}

    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _extract_questions(metadata: dict[str, Any]) -> list[str]:
    """Extract valid interview questions from metadata."""
    questions = metadata.get("questions")

    if isinstance(questions, list):
        return [str(question).strip() for question in questions if str(question).strip()]

    return []


def _speech_text(message: Any) -> str:
    """Extract text from the message shapes emitted by LiveKit."""
    if isinstance(message, str):
        return message

    if hasattr(message, "content"):
        content = message.content

        if isinstance(content, str):
            return content

        if isinstance(content, list):
            return " ".join(
                part.text if hasattr(part, "text") else str(part)
                for part in content
            )

    if hasattr(message, "text_content"):
        return str(message.text_content or "")

    return str(message)


class InterviewPrepAgent(Agent):
    """A warm, structured voice interview agent."""

    def __init__(
        self,
        questions: list[str],
        user_name: str,
        role: str,
        level: str,
        techstack: list[str],
        room: rtc.Room,
    ) -> None:
        self._room = room
        self._ended = False

        conversation_policy = (
            "\n\nConversation policy:\n"
            "- You are the interviewer, not a tutor.\n"
            "- Never provide answers, hints, solutions, example code, or correctness judgments.\n"
            "- Listen without interrupting the candidate.\n"
            "- A short, incomplete, or imperfect response still counts as an answer.\n"
            "- Sound natural and human. Use short, varied acknowledgements such as "
            "'Thank you for explaining that' or 'I appreciate the context.'\n"
            "- Do not over-praise or say whether an answer is right or wrong.\n"
            "- If asked to repeat a question, repeat only that question.\n"
            "- If asked to clarify, briefly rephrase the question without giving a hint.\n"
            "- If asked for an answer or a hint, politely say you would like to hear "
            "the candidate's own approach, then repeat the current question.\n"
            "- If the candidate goes off-topic, politely guide them back to the current question.\n"
            "- Keep every response concise, clear, and natural for spoken conversation.\n"
            "- Never use markdown, bullet symbols, or stage directions in speech.\n"
        )

        if questions:
            numbered_questions = "\n".join(
                f"{index + 1}. {question}"
                for index, question in enumerate(questions)
            )

            role_description = f"{level} {role}".strip()

            full_instructions = (
                f"You are a warm, professional interviewer conducting a "
                f"{role_description} voice interview with {user_name}.\n"
                "Speak clearly, conversationally, and at a calm pace.\n\n"
                f"You have exactly {len(questions)} questions to ask in this exact order:\n"
                f"{numbered_questions}\n\n"
                "Interview flow:\n"
                "1. Start the conversation yourself. Welcome the candidate by name, "
                "mention the role, explain briefly that you will ask one question at "
                "a time, then ask Question 1.\n"
                "2. Ask only one question at a time.\n"
                "3. After each answer, give one short neutral acknowledgement, then "
                "smoothly ask the next listed question.\n"
                "4. Ask every listed question exactly once. Do not skip or add questions.\n"
                "5. After the final answer, give a warm and brief goodbye.\n"
                "6. The final sentence of your closing message must be exactly: "
                "This concludes our interview.\n"
                "7. Never say that closing sentence before the final answer.\n"
            ) + conversation_policy

        else:
            tech_str = ", ".join(techstack) if techstack else "relevant technologies"
            role_description = f"{level} {role}".strip()

            full_instructions = (
                f"You are a warm, professional interviewer conducting a "
                f"{role_description} voice interview with {user_name}.\n"
                "Speak clearly, conversationally, and at a calm pace.\n\n"
                f"The candidate is applying for a {role_description} role using: {tech_str}.\n"
                "Start the conversation yourself. Welcome the candidate by name, explain "
                "that you will ask five questions one at a time, then ask the first question.\n"
                "Ask exactly 5 relevant interview questions.\n"
                "Ask only one question at a time.\n"
                "After every answer, give one short neutral acknowledgement and ask the next question.\n"
                "Do not ask more than five questions.\n"
                "After the fifth answer, give a warm and brief goodbye.\n"
                "The final sentence of your closing message must be exactly: "
                "This concludes our interview.\n"
                "Never say that closing sentence before the final answer.\n"
            ) + conversation_policy

        super().__init__(instructions=full_instructions)

    async def on_enter(self) -> None:
        """Start the interview without waiting for the candidate to speak."""
        logger.info("Interview agent entering session.")

        await self.session.generate_reply(
            instructions=(
                "Begin the interview now. Welcome the candidate by name, establish a "
                "relaxed and professional tone, and immediately ask the first question."
            ),
            allow_interruptions=True,
        )

    async def end_session(self) -> None:
        """Notify the frontend, then disconnect the room."""
        if self._ended:
            return

        self._ended = True

        try:
            payload = json.dumps({"event": "session-ended"}).encode("utf-8")
            await self._room.local_participant.publish_data(
                payload,
                reliable=True,
            )
            logger.info("Sent session-ended signal to frontend.")

            # Gives the frontend time to receive the event before disconnecting.
            await asyncio.sleep(1)

        except Exception as error:
            logger.warning("Could not send session-ended signal: %s", error)

        try:
            await self._room.disconnect()
            logger.info("Room disconnected.")

        except Exception as error:
            logger.warning("Error disconnecting room: %s", error)


server = AgentServer()


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(
    agent_name=os.getenv("LIVEKIT_AGENT_NAME", "sensai-interview-agent")
)
async def entrypoint(ctx: JobContext) -> None:
    job_meta = _safe_json_loads(getattr(ctx.job, "metadata", None))
    room_meta = _safe_json_loads(ctx.room.metadata)
    merged = {**room_meta, **job_meta}

    questions = _extract_questions(merged)
    user_name = str(merged.get("userName") or "candidate").strip()
    role = str(merged.get("role") or "Software Engineer").strip()
    level = str(merged.get("level") or "").strip()

    techstack_raw = merged.get("techstack")
    techstack = (
        [str(technology).strip() for technology in techstack_raw if str(technology).strip()]
        if isinstance(techstack_raw, list)
        else []
    )

    logger.info(
        "Session started — user=%s, role=%s, level=%s, questions=%d",
        user_name,
        role,
        level,
        len(questions),
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
            voice="6ccbfb76-1fc6-48f7-b71d-91ac6298247b",
            language="en",
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=False,
    )

    @session.on("agent_speech_committed")
    def on_agent_speech_committed(message: Any) -> None:
        text = _speech_text(message)

        logger.debug("Agent speech committed: %s", text[:150])

        closing_detected = re.search(
            r"\b("
            r"this concludes (?:our|the) interview"
            r"|that concludes (?:our|the) interview"
            r"|(?:our|the) interview (?:is|has been|is now) (?:concluded|complete|over)"
            r"|(?:concludes|conclude) (?:our|the|this) (?:interview|session)"
            r")\b",
            text,
            re.IGNORECASE,
        )

        if closing_detected and not agent._ended:
            logger.info("Closing phrase detected (%r) — ending session.", closing_detected.group())
            asyncio.get_running_loop().create_task(agent.end_session())

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


if __name__ == "__main__":
    cli.run_app(server)