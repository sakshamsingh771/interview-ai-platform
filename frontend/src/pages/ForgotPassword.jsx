import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const res = await forgotPassword(email);
    setResult(res);
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-2.5 w-2.5 rounded-full bg-gold shadow-glow" />
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="mt-1.5 text-sm text-muted">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {result && (
            <div
              className={`rounded-md border px-3.5 py-2.5 text-sm ${
                result.ok
                  ? "border-teal/40 bg-teal/10 text-teal"
                  : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {result.message}
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-gold hover:text-goldSoft">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
