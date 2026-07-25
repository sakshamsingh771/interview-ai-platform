import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";
import GithubSignInButton from "../components/GithubSignInButton.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import PasswordStrengthMeter, { getPasswordStrength } from "../components/PasswordStrengthMeter.jsx";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { signup, loading, error, setError } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  function clearFieldError(field) {
    if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: undefined });
  }

  function validate() {
    const errors = {};
    if (!fullName.trim() || fullName.trim().length < 2) errors.fullName = "Enter your full name.";
    if (!email.trim()) errors.email = "Email is required.";
    else if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < 8) errors.password = "Use at least 8 characters.";
    else if (getPasswordStrength(password) < 2) errors.password = "Choose a stronger password.";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    const ok = await signup(fullName, email, password);
    if (ok) {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 700);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-sm animate-enterUp sm:max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-2.5 w-2.5 rounded-full bg-gold shadow-glow" />
          <h1 className="text-2xl font-semibold sm:text-3xl">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted">Start running mock interviews in minutes.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card space-y-4 transition-colors duration-300">
          {success && (
            <div className="flex items-center gap-2 rounded-md border border-teal/40 bg-teal/10 px-3.5 py-2.5 text-sm text-teal animate-enterUp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
              </svg>
              Account created — taking you to your dashboard…
            </div>
          )}

          {error && !success && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger animate-enterUp">
              {error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              className={`input-field ${fieldErrors.fullName ? "border-danger focus:border-danger" : ""}`}
              placeholder="Saksham Singh"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearFieldError("fullName");
              }}
            />
            {fieldErrors.fullName && <p className="mt-1.5 text-xs text-danger">{fieldErrors.fullName}</p>}
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`input-field ${fieldErrors.email ? "border-danger focus:border-danger" : ""}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
            />
            {fieldErrors.email && <p className="mt-1.5 text-xs text-danger">{fieldErrors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              error={fieldErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">Confirm password</label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError("confirmPassword");
              }}
            />
          </div>

          <button type="submit" disabled={loading || success} className="btn-primary w-full">
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4Z" />
                </svg>
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">or continue with</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2.5">
          <GoogleSignInButton />
          <GithubSignInButton />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-gold hover:text-goldSoft">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
