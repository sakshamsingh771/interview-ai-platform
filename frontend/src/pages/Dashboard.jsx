import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { interviewApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_GROUPS, ROLE_TOPICS, CUSTOM_TOPIC_VALUE } from "../data/roleTopics.js";

const DIFFICULTIES = ["easy", "medium", "hard"];

function ReadinessRing({ score }) {
  // score is 0-10; render as a ring out of 10.
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#2C3644" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none" stroke="#C9A227" strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-2xl font-semibold">{score.toFixed(1)}</span>
        <span className="text-xs text-muted">/ 10</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, resendVerification } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [verifyNotice, setVerifyNotice] = useState("");
  const [resending, setResending] = useState(false);
  const [form, setForm] = useState({
    role: "",
    topic: "",
    difficulty: "medium",
    num_questions: 5,
  });
  const [topicMode, setTopicMode] = useState(CUSTOM_TOPIC_VALUE); // preset topic string, or CUSTOM_TOPIC_VALUE

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoadingList(true);
    try {
      const { data } = await interviewApi.list();
      setSessions(data);
    } catch {
      // Non-fatal: dashboard still renders the "start new interview" form.
    } finally {
      setLoadingList(false);
    }
  }

  async function handleResendVerification() {
    setResending(true);
    const res = await resendVerification();
    setVerifyNotice(res.message);
    setResending(false);
  }

  function handleRoleChange(role) {
    const topics = ROLE_TOPICS[role] || [];
    const defaultTopic = topics[0] || "";
    setForm({ ...form, role, topic: defaultTopic });
    setTopicMode(defaultTopic || CUSTOM_TOPIC_VALUE);
  }

  function handleTopicModeChange(value) {
    setTopicMode(value);
    setForm({ ...form, topic: value === CUSTOM_TOPIC_VALUE ? "" : value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    if (!form.role.trim() || !form.topic.trim()) {
      setFormError("Role and topic are both required.");
      return;
    }
    setCreating(true);
    try {
      const { data } = await interviewApi.create(form);
      navigate(`/interview/${data.id}`);
    } catch (err) {
      setFormError(err.response?.data?.detail || "Could not start the interview. Try again.");
    } finally {
      setCreating(false);
    }
  }

  const completed = sessions.filter((s) => s.status === "completed" && s.overall_score != null);
  const avgScore = completed.length
    ? completed.reduce((sum, s) => sum + s.overall_score, 0) / completed.length
    : 0;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {user && !user.is_verified && (
          <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-md border border-gold/30 bg-gold/5 px-4 py-3 text-sm sm:flex-row sm:items-center">
            <span className="text-paper">
              {verifyNotice || "Please verify your email address to secure your account."}
            </span>
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="whitespace-nowrap text-xs font-medium text-gold hover:text-goldSoft"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        )}

        <div className="mb-10 grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
          <div className="card flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
            <ReadinessRing score={avgScore} />
            <div className="min-w-0">
              <p className="text-sm text-muted">Overall readiness</p>
              <p className="mt-1 font-display text-xl font-semibold">
                {completed.length} interview{completed.length === 1 ? "" : "s"} completed
              </p>
              <p className="mt-1 text-sm text-muted">
                Average score across every completed session.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="card">
            <h2 className="mb-4 font-display text-lg font-semibold">Start a new interview</h2>
            {formError && (
              <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                {formError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="role">Target role</label>
                <select
                  id="role"
                  className="input-field"
                  value={form.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="" disabled>Select a role…</option>
                  {ROLE_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="topic">Topic</label>
                <select
                  id="topic"
                  className="input-field"
                  value={topicMode}
                  disabled={!form.role}
                  onChange={(e) => handleTopicModeChange(e.target.value)}
                >
                  {!form.role && <option value={CUSTOM_TOPIC_VALUE}>Select a role first</option>}
                  {form.role &&
                    (ROLE_TOPICS[form.role] || []).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  {form.role && <option value={CUSTOM_TOPIC_VALUE}>Custom topic…</option>}
                </select>
                {form.role && topicMode === CUSTOM_TOPIC_VALUE && (
                  <input
                    className="input-field mt-2"
                    placeholder="Type a custom topic"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  />
                )}
              </div>
              <div>
                <label className="label" htmlFor="difficulty">Difficulty</label>
                <select
                  id="difficulty"
                  className="input-field"
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="num_questions">Number of questions</label>
                <input
                  id="num_questions"
                  type="number"
                  min={3}
                  max={20}
                  className="input-field"
                  value={form.num_questions}
                  onChange={(e) => setForm({ ...form, num_questions: Number(e.target.value) })}
                />
              </div>
            </div>
            <button type="submit" disabled={creating} className="btn-primary mt-5 w-full sm:w-auto">
              {creating ? "Preparing questions…" : "Begin interview"}
            </button>
          </form>
        </div>

        <section>
          <h2 className="mb-4 font-display text-lg font-semibold">Past sessions</h2>

          {loadingList && <p className="text-sm text-muted">Loading your history…</p>}

          {!loadingList && sessions.length === 0 && (
            <div className="card text-center text-sm text-muted">
              No interviews yet. Start one above to build your first result.
            </div>
          )}

          <div className="grid gap-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(s.status === "completed" ? `/results/${s.id}` : `/interview/${s.id}`)}
                className="card flex flex-wrap items-center justify-between gap-2 text-left transition hover:border-gold/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{s.role} · {s.topic}</p>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(s.created_at).toLocaleDateString()} · {s.difficulty} ·{" "}
                    {s.status === "completed" ? "Completed" : "In progress"}
                  </p>
                </div>
                {s.overall_score != null ? (
                  <span className="shrink-0 font-mono text-lg font-semibold text-gold">
                    {s.overall_score.toFixed(1)}
                  </span>
                ) : (
                  <span className="shrink-0 text-sm text-muted">Resume →</span>
                )}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
