import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { interviewApi } from "../api/client.js";

export default function Results() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await interviewApi.get(sessionId);
        setSession(data);
      } catch {
        setError("Could not load this result.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-2xl px-6 py-16 text-center text-sm text-muted">Loading results…</p>
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

  const scoreColor =
    session.overall_score >= 7.5 ? "text-teal" : session.overall_score >= 5 ? "text-gold" : "text-danger";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="card mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            {session.role} · {session.topic} · {session.difficulty}
          </p>
          <p className={`mt-3 font-display text-5xl font-semibold ${scoreColor}`}>
            {session.overall_score?.toFixed(1)}
            <span className="text-lg text-muted">/10</span>
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
            {session.overall_feedback}
          </p>
        </div>

        <h2 className="mb-4 font-display text-lg font-semibold">Question by question</h2>
        <div className="space-y-4">
          {session.questions.map((q, i) => (
            <div key={q.id} className="card">
              <p className="mb-2 font-mono text-xs text-muted">Question {i + 1}</p>
              <p className="mb-3 font-medium">{q.content}</p>
              {q.answer && (
                <>
                  <p className="mb-3 whitespace-pre-wrap rounded-md border border-border bg-ink/40 p-3 text-sm text-muted">
                    {q.answer.content}
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm font-semibold text-gold">
                      {q.answer.score?.toFixed(1)}/10
                    </span>
                    <p className="text-sm">{q.answer.feedback}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/dashboard" className="btn-secondary">← Back to dashboard</Link>
        </div>
      </main>
    </div>
  );
}
