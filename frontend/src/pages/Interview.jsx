import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { interviewApi } from "../api/client.js";

export default function Interview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await interviewApi.get(sessionId);
      setSession(data);
      const firstUnanswered = data.questions.findIndex((q) => !q.answer);
      setActiveIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
    } catch {
      setError("Could not load this interview session.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-2xl px-6 py-16 text-center text-sm text-muted">Loading interview…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-2xl px-6 py-16 text-center text-sm text-danger">{error}</p>
      </div>
    );
  }

  const questions = session.questions;
  const activeQuestion = questions[activeIndex];
  const answeredCount = questions.filter((q) => q.answer).length;
  const allAnswered = answeredCount === questions.length;

  async function handleSubmitAnswer(e) {
    e.preventDefault();
    if (!answerText.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { data: answer } = await interviewApi.submitAnswer(sessionId, activeQuestion.id, answerText);
      setSession((prev) => ({
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === activeQuestion.id ? { ...q, answer } : q
        ),
      }));
      setAnswerText("");
      if (activeIndex < questions.length - 1) {
        setActiveIndex(activeIndex + 1);
      }
    } catch {
      setError("Could not score that answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setError("");
    try {
      await interviewApi.complete(sessionId);
      navigate(`/results/${sessionId}`);
    } catch {
      setError("Could not complete the interview. Please try again.");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-muted">Live session</span>
          </div>
          <span className="font-mono text-xs text-muted">
            {session.role} · {session.topic} · {session.difficulty}
          </span>
        </div>

        {session.preparation_strategy && (
          <details className="card mb-6 open:pb-6">
            <summary className="cursor-pointer list-none font-display text-sm font-semibold text-gold">
              📋 Preparation Strategy & Core Concept Roadmap
            </summary>
            <pre className="mt-4 whitespace-pre-wrap font-body text-sm leading-relaxed text-muted">
              {session.preparation_strategy}
            </pre>
          </details>
        )}

        <div className="mb-6 flex gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 flex-1 rounded-full transition ${
                q.answer ? "bg-gold" : i === activeIndex ? "bg-border ring-1 ring-gold/50" : "bg-border"
              }`}
              aria-label={`Question ${i + 1}`}
            />
          ))}
        </div>

        <div className="card">
          <p className="mb-2 font-mono text-xs text-muted">
            Question {activeIndex + 1} of {questions.length}
          </p>
          <p className="mb-6 text-lg leading-relaxed">{activeQuestion.content}</p>

          {activeQuestion.answer ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-ink/40 p-4 text-sm text-muted whitespace-pre-wrap">
                {activeQuestion.answer.content}
              </div>
              <div className="flex items-start gap-3 rounded-md border border-gold/30 bg-gold/5 p-4">
                <span className="font-mono text-sm font-semibold text-gold">
                  {activeQuestion.answer.score?.toFixed(1)}/10
                </span>
                <p className="text-sm text-paper">{activeQuestion.answer.feedback}</p>
              </div>
              {activeIndex < questions.length - 1 && (
                <button onClick={() => setActiveIndex(activeIndex + 1)} className="btn-secondary">
                  Next question →
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              {error && (
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                  {error}
                </div>
              )}
              <textarea
                className="input-field min-h-[140px] resize-y"
                placeholder="Type your answer as if you were speaking to the interviewer…"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
              />
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Scoring your answer…" : "Submit answer"}
              </button>
            </form>
          )}
        </div>

        {allAnswered && (
          <div className="mt-6 flex justify-end">
            <button onClick={handleFinish} disabled={finishing} className="btn-primary">
              {finishing ? "Finalizing…" : "Finish interview →"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
