"""
All AI-provider calls and prompt construction live here. Routers never talk
to the OpenAI/Anthropic SDKs directly - they call these functions and get
back plain Python data. This is the single "reusable AI service" the rest
of the app depends on.

Provider priority for question generation: OpenAI (if OPENAI_API_KEY is set)
-> Anthropic (if ANTHROPIC_API_KEY is set) -> a curated offline question
bank. Each tier is tried in order and any failure (missing key, timeout,
rate limit, malformed output) silently falls through to the next tier -
nothing in this module raises, so a flaky/unconfigured AI provider can
never take down interview creation.

evaluate_answer/summarize_session are unchanged from before (Anthropic ->
offline) since only question generation was asked to gain OpenAI + variety.
"""
import json
import logging
import random
import re
import secrets
from typing import List, Optional

from anthropic import AsyncAnthropic
from anthropic import APIError as AnthropicAPIError
from anthropic import APITimeoutError as AnthropicAPITimeoutError
from openai import AsyncOpenAI
from openai import APIError as OpenAIAPIError
from openai import APITimeoutError as OpenAIAPITimeoutError

from app.config import settings

logger = logging.getLogger("preproom.ai_service")

ANTHROPIC_MODEL = "claude-sonnet-4-6"
REQUEST_TIMEOUT_SECONDS = 30.0

_anthropic_client: Optional[AsyncAnthropic] = None
_anthropic_client_init_failed = False
_openai_client: Optional[AsyncOpenAI] = None
_openai_client_init_failed = False


def _get_anthropic_client() -> Optional[AsyncAnthropic]:
    """Lazily builds a single shared AsyncAnthropic client. Returns None
    (never raises) if unconfigured or if init fails for any reason."""
    global _anthropic_client, _anthropic_client_init_failed

    if _anthropic_client is not None:
        return _anthropic_client
    if _anthropic_client_init_failed or not settings.ANTHROPIC_API_KEY:
        return None

    try:
        _anthropic_client = AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=REQUEST_TIMEOUT_SECONDS,
            max_retries=2,
        )
        return _anthropic_client
    except Exception:
        logger.exception("Failed to initialize Anthropic client - skipping this provider")
        _anthropic_client_init_failed = True
        return None


def _get_openai_client() -> Optional[AsyncOpenAI]:
    """Lazily builds a single shared AsyncOpenAI client. Returns None
    (never raises) if unconfigured or if init fails for any reason."""
    global _openai_client, _openai_client_init_failed

    if _openai_client is not None:
        return _openai_client
    if _openai_client_init_failed or not settings.OPENAI_API_KEY:
        return None

    try:
        _openai_client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=REQUEST_TIMEOUT_SECONDS,
            max_retries=2,  # SDK-level retries for transient network/5xx errors
        )
        return _openai_client
    except Exception:
        logger.exception("Failed to initialize OpenAI client - skipping this provider")
        _openai_client_init_failed = True
        return None


def _extract_json(text: str):
    """Models are asked to return raw JSON, but strip code fences defensively."""
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def _normalize_question(question: str) -> str:
    """Loose key for duplicate detection - case/punctuation/whitespace
    differences shouldn't count as "different" questions."""
    return re.sub(r"[^a-z0-9]+", " ", question.lower()).strip()


def _dedupe_questions(questions: List[str]) -> List[str]:
    """Removes exact/near-duplicate questions while preserving order.
    Guards against a model repeating itself within one response."""
    seen = set()
    unique: List[str] = []
    for q in questions:
        q = (q or "").strip()
        if not q:
            continue
        key = _normalize_question(q)
        if key in seen:
            continue
        seen.add(key)
        unique.append(q)
    return unique


# ---------- Curated offline question bank ----------
#
# Used three ways: (1) full offline fallback when no AI provider is
# configured/reachable, (2) backfilling a session's question set if an AI
# response comes back short after deduping, (3) never repeated within a
# single session since templates are shuffled and sampled without
# replacement. Deliberately spans technical, behavioral, and situational
# categories for good coverage regardless of which provider (or neither)
# actually served the request.
QUESTION_BANK = {
    "technical": [
        "({difficulty}) Walk me through how you'd design a solution for a {topic} problem in a {role} context, from requirements to a working approach.",
        "({difficulty}) What are the key trade-offs you'd weigh when making an architectural decision related to {topic} as a {role}?",
        "({difficulty}) Describe a time {topic} concepts directly impacted the performance or reliability of something you built.",
        "({difficulty}) How would you debug a production issue that you suspect is related to {topic}?",
        "({difficulty}) What's a common mistake engineers make with {topic}, and how would you avoid it as a {role}?",
        "({difficulty}) How would you explain a core {topic} concept to a junior {role} who's never encountered it before?",
        "({difficulty}) What tools or techniques do you rely on when working with {topic}, and why those specifically?",
        "({difficulty}) How would you evaluate whether a proposed {topic} solution is production-ready?",
        "({difficulty}) What would you do differently if you had to scale a {topic}-related system 10x?",
        "({difficulty}) Compare two different approaches to solving a {topic} problem - what are the pros and cons of each?",
        "({difficulty}) How do you stay current with best practices in {topic}, and how has that changed your approach recently?",
        "({difficulty}) What edge cases would you specifically test for in a {topic}-related feature?",
    ],
    "behavioral": [
        "Tell me about a time you disagreed with a technical decision related to {topic}. How did you handle it?",
        "Describe a project where your understanding of {topic} was tested under a tight deadline. What happened?",
        "Tell me about a mistake you made that involved {topic}. What did you learn from it?",
        "How do you prioritize your work when multiple {topic}-related tasks compete for your attention?",
        "Describe a time you had to learn something new about {topic} quickly to unblock a project.",
        "Tell me about a time you gave or received difficult feedback on {topic}-related work.",
        "Describe a situation where you had to convince a skeptical teammate or stakeholder about a {topic} decision.",
        "Tell me about your proudest accomplishment as a {role} involving {topic}.",
    ],
    "situational": [
        "Imagine you inherit a legacy system with serious {topic}-related technical debt. What's your first move?",
        "Suppose a {topic}-related outage happens right before a major release. How do you handle it as a {role}?",
        "If you had to onboard a new {role} onto a {topic}-heavy codebase in one week, how would you approach it?",
        "A stakeholder wants a {topic} feature shipped faster than you think is safe. What do you do?",
        "You discover a {topic}-related security or data issue after launch. Walk me through your response.",
        "You're asked to choose between two competing {topic} approaches with no clear best answer. How do you decide?",
        "Your team is split on how to handle a {topic} decision. As the {role}, how do you drive it to resolution?",
        "You have limited time and must cut scope on a {topic}-heavy project. What do you cut and why?",
    ],
}


def _bank_questions(role: str, topic: str, difficulty: str) -> List[str]:
    """Every template across all categories, formatted and shuffled -
    sampling without replacement from this list can never repeat within
    a session since each template is used at most once here."""
    templates = [t for group in QUESTION_BANK.values() for t in group]
    random.shuffle(templates)
    return [t.format(role=role, topic=topic, difficulty=difficulty.title()) for t in templates]


def _offline_questions(role: str, topic: str, difficulty: str, num_questions: int) -> List[str]:
    return _bank_questions(role, topic, difficulty)[:num_questions]


def _backfill_questions(existing: List[str], role: str, topic: str, difficulty: str, target_count: int) -> List[str]:
    """Tops up a (deduped) AI-generated question list with distinct bank
    questions if the model returned fewer unique questions than requested."""
    existing_keys = {_normalize_question(q) for q in existing}
    result = list(existing)
    for candidate in _bank_questions(role, topic, difficulty):
        if len(result) >= target_count:
            break
        key = _normalize_question(candidate)
        if key in existing_keys:
            continue
        existing_keys.add(key)
        result.append(candidate)
    return result


def _format_strategy_text(strategy: dict, role: str, topic: str, difficulty: str) -> str:
    """Renders the structured strategy payload into the plain-text form we
    persist in InterviewSession.preparation_strategy (a TEXT column)."""
    key_topics = strategy.get("key_topics") or []
    core_concepts = strategy.get("core_concepts") or []
    checklist = strategy.get("checklist") or []

    lines = [f"Preparation Strategy — {role} · {topic} ({difficulty})", ""]

    if key_topics:
        lines.append("Key topics to master:")
        lines += [f"- {t}" for t in key_topics]
        lines.append("")

    if core_concepts:
        lines.append("Expected technical concepts:")
        lines += [f"- {c}" for c in core_concepts]
        lines.append("")

    if checklist:
        lines.append("Preparation checklist:")
        lines += [f"[ ] {c}" for c in checklist]

    return "\n".join(lines).strip()


def _offline_strategy_text(role: str, topic: str, difficulty: str) -> str:
    return _format_strategy_text(
        {
            "key_topics": [f"Core fundamentals of {topic}", f"Common {role} interview patterns"],
            "core_concepts": ["Trade-off analysis", "Complexity / scalability reasoning"],
            "checklist": [
                f"Review the fundamentals of {topic}",
                "Practice explaining your reasoning out loud",
                "Time yourself on a mock question",
            ],
        },
        role, topic, difficulty,
    )


def _offline_package(role: str, topic: str, difficulty: str, num_questions: int) -> dict:
    return {
        "questions": _offline_questions(role, topic, difficulty, num_questions),
        "preparation_strategy": _offline_strategy_text(role, topic, difficulty),
    }


# ---------- Provider calls ----------
# Each returns the raw text response, or None on ANY failure (never raises).
# Keeping the provider-specific SDK calls isolated here means the parsing/
# dedup/backfill logic below is written once and works no matter which
# provider actually answered.

async def _call_openai(system_prompt: str, user_prompt: str, max_tokens: int) -> Optional[str]:
    client = _get_openai_client()
    if client is None:
        return None
    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            max_tokens=max_tokens,
            temperature=0.9,  # higher temperature -> more varied question sets across sessions
            response_format={"type": "json_object"},  # guarantees valid JSON, avoids fence-stripping games
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content
    except OpenAIAPITimeoutError:
        logger.warning("OpenAI request timed out")
        return None
    except OpenAIAPIError:
        logger.exception("OpenAI API error")
        return None
    except Exception:
        logger.exception("Unexpected error calling OpenAI")
        return None


async def _call_anthropic(system_prompt: str, user_prompt: str, max_tokens: int) -> Optional[str]:
    client = _get_anthropic_client()
    if client is None:
        return None
    try:
        message = await client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(block.text for block in message.content if block.type == "text")
    except AnthropicAPITimeoutError:
        logger.warning("Anthropic request timed out")
        return None
    except AnthropicAPIError:
        logger.exception("Anthropic API error")
        return None
    except Exception:
        logger.exception("Unexpected error calling Anthropic")
        return None


# ---------- Public API ----------

async def generate_interview_package(role: str, topic: str, difficulty: str, num_questions: int) -> dict:
    """
    Returns {"questions": [str, ...], "preparation_strategy": str}.

    Tries OpenAI, then Anthropic, then the offline bank - in that order,
    falling through silently on any failure. Always returns exactly
    `num_questions` unique questions.
    """
    system_prompt = (
        "You are an experienced technical interviewer and career coach. "
        "Respond with ONLY a single JSON object, no preamble, no markdown fences, "
        "shaped exactly like this:\n"
        "{\n"
        '  "questions": [string, ...],\n'
        '  "preparation_strategy": {\n'
        '    "key_topics": [string, ...],\n'
        '    "core_concepts": [string, ...],\n'
        '    "checklist": [string, ...]\n'
        "  }\n"
        "}"
    )
    # A short random token is included purely to discourage the model from
    # returning its usual "top of distribution" answer for identical
    # role/topic/difficulty inputs across different sessions - it carries
    # no meaning and the model is told to ignore it as content.
    variety_token = secrets.token_hex(4)

    user_prompt = (
        f"Generate {num_questions} DISTINCT interview questions (no duplicates or near-duplicates) "
        f"for a candidate interviewing for the role of '{role}', focused on the topic '{topic}', "
        f"at '{difficulty}' difficulty.\n\n"
        f"Include a healthy mix across three categories: technical questions, behavioral questions, "
        f"and situational/scenario questions. Avoid generic textbook questions - make them specific "
        f"to the role and topic. Questions should escalate slightly in depth as the list progresses.\n\n"
        f"Also produce a personalized preparation strategy for this exact role/topic/difficulty: "
        f"3-6 key topics to master, 3-6 expected technical concepts, and a 4-8 item step-by-step "
        f"checklist to prepare for this specific challenge.\n\n"
        f"(session variety token, ignore as content: {variety_token})\n\n"
        f"Return ONLY the JSON object described in the system prompt."
    )
    # Scale the token budget with how many questions were asked for, so a
    # 20-question request isn't truncated mid-response.
    max_tokens = min(4096, 700 + 120 * num_questions)

    raw_text = await _call_openai(system_prompt, user_prompt, max_tokens)
    provider = "openai" if raw_text else None

    if raw_text is None:
        raw_text = await _call_anthropic(system_prompt, user_prompt, max_tokens)
        provider = "anthropic" if raw_text else None

    if raw_text is None:
        return _offline_package(role, topic, difficulty, num_questions)

    try:
        parsed = _extract_json(raw_text)
        questions = _dedupe_questions([str(q) for q in parsed.get("questions", [])])
        if len(questions) < num_questions:
            questions = _backfill_questions(questions, role, topic, difficulty, num_questions)
        questions = questions[:num_questions]

        strategy_text = _format_strategy_text(
            parsed.get("preparation_strategy") or {}, role, topic, difficulty
        )
        if not strategy_text.strip():
            raise ValueError("Model returned an empty preparation strategy")

        return {"questions": questions, "preparation_strategy": strategy_text}

    except (json.JSONDecodeError, ValueError, KeyError, AttributeError, TypeError):
        logger.warning("Could not parse %s output as the expected JSON shape - salvaging/backfilling", provider)
        # Defensive fallback: try to salvage plain-text lines as questions,
        # dedupe them, then top up from the bank rather than discarding
        # everything the model produced.
        lines = [l.strip("-• ").strip() for l in raw_text.splitlines() if l.strip()]
        questions = _dedupe_questions(lines)
        questions = _backfill_questions(questions, role, topic, difficulty, num_questions)[:num_questions]
        return {
            "questions": questions,
            "preparation_strategy": _offline_strategy_text(role, topic, difficulty),
        }


async def evaluate_answer(role: str, topic: str, question: str, answer: str) -> dict:
    """Returns {"score": float 0-10, "feedback": str}. Unchanged from
    before - only question generation gained OpenAI + variety per the request."""
    client = _get_anthropic_client()

    if client is None:
        return {
            "score": 7.0,
            "feedback": (
                "Offline demo mode: connect an ANTHROPIC_API_KEY to receive real, "
                "personalized feedback on this answer."
            ),
        }

    system_prompt = (
        "You are a strict but fair technical interviewer grading a candidate's answer. "
        "Respond with ONLY a JSON object: {\"score\": number between 0 and 10, "
        "\"feedback\": string with 2-4 sentences of specific, actionable feedback}. "
        "No markdown, no preamble."
    )
    user_prompt = (
        f"Role: {role}\nTopic: {topic}\n"
        f"Question: {question}\n"
        f"Candidate's answer: {answer}\n\n"
        "Grade the answer and return the JSON object described in the system prompt."
    )

    raw_text = await _call_anthropic(system_prompt, user_prompt, max_tokens=512)
    if raw_text is None:
        return {
            "score": 5.0,
            "feedback": "Could not reach the AI grader just now, so this is a neutral placeholder score.",
        }

    try:
        result = _extract_json(raw_text)
        return {"score": float(result["score"]), "feedback": str(result["feedback"])}
    except (json.JSONDecodeError, KeyError, ValueError, TypeError):
        return {"score": 5.0, "feedback": raw_text[:500]}


async def summarize_session(role: str, topic: str, qa_pairs: List[dict]) -> dict:
    """
    qa_pairs: [{"question": str, "answer": str, "score": float, "feedback": str}, ...]
    Returns {"overall_score": float, "overall_feedback": str}. Unchanged
    from before - only question generation gained OpenAI + variety per the request.
    """
    if not qa_pairs:
        return {"overall_score": 0.0, "overall_feedback": "No answers were submitted."}

    scores = [qa["score"] for qa in qa_pairs if qa.get("score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    client = _get_anthropic_client()
    if client is None:
        return {
            "overall_score": avg_score,
            "overall_feedback": (
                f"You averaged {avg_score}/10 across {len(qa_pairs)} questions on {topic}. "
                "Connect an ANTHROPIC_API_KEY for a detailed, personalized summary."
            ),
        }

    system_prompt = (
        "You are a technical interview coach writing a short closing summary for a "
        "candidate. Respond with ONLY a JSON object: "
        "{\"overall_feedback\": string, 3-5 sentences, encouraging but honest, "
        "highlighting one strength and one concrete area to improve}. No markdown."
    )
    transcript = "\n\n".join(
        f"Q{i+1}: {qa['question']}\nA{i+1}: {qa['answer']}\nScore: {qa.get('score')}/10"
        for i, qa in enumerate(qa_pairs)
    )
    user_prompt = (
        f"Role: {role}\nTopic: {topic}\nAverage score: {avg_score}/10\n\n{transcript}\n\n"
        "Write the closing summary JSON object."
    )

    raw_text = await _call_anthropic(system_prompt, user_prompt, max_tokens=512)
    if raw_text is None:
        return {
            "overall_score": avg_score,
            "overall_feedback": f"You averaged {avg_score}/10 across {len(qa_pairs)} questions on {topic}.",
        }

    try:
        result = _extract_json(raw_text)
        return {"overall_score": avg_score, "overall_feedback": str(result["overall_feedback"])}
    except (json.JSONDecodeError, KeyError, TypeError):
        return {"overall_score": avg_score, "overall_feedback": raw_text[:600]}
