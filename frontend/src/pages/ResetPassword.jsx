import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setResult({ ok: false, message: "Passwords don't match." });
      return;
    }
    setSubmitting(true);
    const res = await resetPassword(token, password);
    setResult(res);
    setSubmitting(false);
    if (res.ok) {
      setTimeout(() => navigate("/login"), 1800);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="text-sm text-danger">This reset link is missing its token.</p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm text-gold hover:text-goldSoft">
            Request a new one →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-2.5 w-2.5 rounded-full bg-gold shadow-glow" />
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
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
            <label className="label" htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input-field"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Resetting…" : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}
