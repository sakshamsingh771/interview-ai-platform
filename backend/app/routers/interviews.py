import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user
from app.services import ai_service

router = APIRouter(prefix="/interviews", tags=["interviews"])


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")


@router.post("/", response_model=schemas.SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: schemas.SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    package = await ai_service.generate_interview_package(
        role=payload.role,
        topic=payload.topic,
        difficulty=payload.difficulty,
        num_questions=payload.num_questions,
    )

    session = models.InterviewSession(
        user_id=current_user.id,
        role=payload.role,
        topic=payload.topic,
        difficulty=payload.difficulty,
        preparation_strategy=package["preparation_strategy"],
    )
    db.add(session)
    await db.flush()  # get session.id before inserting questions

    for i, text in enumerate(package["questions"]):
        db.add(models.Question(session_id=session.id, order_index=i, content=text))

    await db.commit()
    await db.refresh(session, attribute_names=["questions"])
    return session


@router.get("/", response_model=List[schemas.SessionSummaryOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.InterviewSession)
        .where(models.InterviewSession.user_id == current_user.id)
        .order_by(models.InterviewSession.created_at.desc())
    )
    return result.scalars().all()


async def _get_owned_session(
    session_id: str, db: AsyncSession, current_user: models.User
) -> models.InterviewSession:
    sid = _parse_uuid(session_id)
    result = await db.execute(
        select(models.InterviewSession).where(
            models.InterviewSession.id == sid,
            models.InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return session


@router.get("/{session_id}", response_model=schemas.SessionOut)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return await _get_owned_session(session_id, db, current_user)


@router.post("/{session_id}/questions/{question_id}/answer", response_model=schemas.AnswerOut)
async def submit_answer(
    session_id: str,
    question_id: str,
    payload: schemas.AnswerSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = await _get_owned_session(session_id, db, current_user)
    qid = _parse_uuid(question_id)
    question = next((q for q in session.questions if q.id == qid), None)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found in this session")

    result = await ai_service.evaluate_answer(
        role=session.role, topic=session.topic, question=question.content, answer=payload.content
    )

    if question.answer:
        question.answer.content = payload.content
        question.answer.score = result["score"]
        question.answer.feedback = result["feedback"]
    else:
        answer = models.Answer(
            question_id=question.id,
            content=payload.content,
            score=result["score"],
            feedback=result["feedback"],
        )
        db.add(answer)
        question.answer = answer

    await db.commit()
    await db.refresh(question, attribute_names=["answer"])
    return question.answer


@router.post("/{session_id}/complete", response_model=schemas.SessionCompleteOut)
async def complete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = await _get_owned_session(session_id, db, current_user)

    qa_pairs = [
        {
            "question": q.content,
            "answer": q.answer.content,
            "score": q.answer.score,
            "feedback": q.answer.feedback,
        }
        for q in session.questions if q.answer is not None
    ]

    if not qa_pairs:
        raise HTTPException(status_code=400, detail="Answer at least one question before completing")

    summary = await ai_service.summarize_session(role=session.role, topic=session.topic, qa_pairs=qa_pairs)

    session.overall_score = summary["overall_score"]
    session.overall_feedback = summary["overall_feedback"]
    session.status = "completed"
    session.completed_at = datetime.utcnow()

    await db.commit()
    return schemas.SessionCompleteOut(**summary)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = await _get_owned_session(session_id, db, current_user)
    await db.delete(session)
    await db.commit()
