import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { interviewApi } from "../api/client.js";

const SpeechRecognitionAPI =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function InteractiveInterview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  // --- Webcam ---
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(true);

  // --- Text-to-speech (AI reads the question) ---
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // --- Speech-to-text (mic capture) ---
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [micUnsupported] = useState(!SpeechRecognitionAPI);
  const [micError, setMicError] = useState("");
  const finalTranscriptRef = useRef(""); // accumulated finalized speech, survives re-renders mid-session

  // ---------- Load session ----------

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

  const questions = session?.questions || [];
  const activeQuestion = questions[activeIndex];
  const answeredCount = questions.filter((q) => q.answer).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  // ---------- Webcam: local preview only, never uploaded anywhere ----------

  useEffect(() => {
    if (!cameraEnabled) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError("");
      } catch {
        setCameraError("Camera access was denied or is unavailable. The interview still works without it.");
        setCameraEnabled(false);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraEnabled]);

  // ---------- Text-to-speech: read each new unanswered question aloud ----------

  const speakQuestion = useCallback((text) => {
    if (muted || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel(); // interrupt any previous utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [muted]);

  useEffect(() => {
    if (activeQuestion && !activeQuestion.answer) {
      speakQuestion(activeQuestion.content);
    }
    return () => window.speechSynthesis?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion?.id]);

  useEffect(() => {
    if (muted) window.speechSynthesis?.cancel();
  }, [muted]);

  // ---------- Speech-to-text: mic button transcribes into the answer box ----------

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setAnswerText((finalTranscriptRef.current + interim).trim());
    };

    recognition.onerror = (event) => {
      setMicError(
        event.error === "not-allowed"
          ? "Microphone access was denied."
          : "Speech recognition hit an error. You can still type your answer."
      );
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) return;
    setMicError("");
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      window.speechSynthesis?.cancel(); // don't talk over the user
      finalTranscriptRef.current = answerText ? answerText + " " : "";
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // start() throws if already started - safe to ignore
      }
    }
  }

  // ---------- Answer submission (same contract as the text-only flow) ----------

  async function handleSubmitAnswer(e) {
    e.preventDefault();
    if (!answerText.trim()) return;
    if (listening) recognitionRef.current?.stop();

    setSubmitting(true);
    setError("");
    try {
      const { data: answer } = await interviewApi.submitAnswer(sessionId, activeQuestion.id, answerText);
      setSession((prev) => ({
        ...prev,
        questions: prev.questions.map((q) => (q.id === activeQuestion.id ? { ...q, answer } : q)),
      }));
      setAnswerText("");
      finalTranscriptRef.current = "";
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-2xl px-6 py-16 text-center text-sm text-muted">Loading interview…</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-2xl px-6 py-16 text-center text-sm text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-muted">Live interview</span>
          </div>
          <span className="font-mono text-xs text-muted">
            {session.role} · {session.topic} · {session.difficulty}
          </span>
        </div>

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

        <div className="grid gap-6 md:grid-cols-[220px,1fr]">
          {/* Webcam preview - local only, never sent to the server */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-gold/40 bg-surface sm:h-40 sm:w-40 md:h-44 md:w-44">
              {cameraEnabled ? (
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              ) : (
                <span className="px-4 text-center text-xs text-muted">Camera off</span>
              )}
              {speaking && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-ink">
                  AI speaking…
                </span>
              )}
            </div>
            {cameraError && <p className="text-center text-xs text-danger">{cameraError}</p>}
            <button
              onClick={() => setCameraEnabled((v) => !v)}
              className="text-xs font-medium text-muted hover:text-paper"
            >
              {cameraEnabled ? "Turn camera off" : "Turn camera on"}
            </button>
            <p className="text-center text-[11px] text-muted">
              Your video stays on your device — it's never uploaded.
            </p>
          </div>

          {/* Question + answer */}
          <div className="card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <p className="font-mono text-xs text-muted">
                Question {activeIndex + 1} of {questions.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => speakQuestion(activeQuestion.content)}
                  disabled={muted}
                  title="Replay question"
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-40"
                >
                  🔊 Replay
                </button>
                <button
                  onClick={() => setMuted((v) => !v)}
                  title={muted ? "Unmute AI voice" : "Mute AI voice"}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-gold/50 hover:text-gold"
                >
                  {muted ? "🔇 Muted" : "🔈 Voice on"}
                </button>
              </div>
            </div>

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
                {micError && (
                  <div className="rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                    {micError}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={micUnsupported}
                    title={micUnsupported ? "Speech recognition isn't supported in this browser" : "Speak your answer"}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40 ${
                      listening
                        ? "border-danger bg-danger/10 text-danger"
                        : "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20"
                    }`}
                  >
                    {listening ? (
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/60" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-danger" />
                      </span>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path strokeLinecap="round" d="M5 10a7 7 0 0014 0M12 19v3" />
                      </svg>
                    )}
                  </button>
                  <p className="text-xs text-muted">
                    {micUnsupported
                      ? "Speech-to-text isn't supported in this browser — you can still type below."
                      : listening
                      ? "Listening — speak your answer, then click the mic to stop."
                      : "Click the mic to speak your answer, or type it below."}
                  </p>
                </div>

                <textarea
                  className="input-field min-h-[140px] resize-y"
                  placeholder="Type your answer, or use the microphone above…"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                />
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Scoring your answer…" : "Submit answer"}
                </button>
              </form>
            )}
          </div>
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
