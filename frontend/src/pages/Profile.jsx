import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import PasswordStrengthMeter, { getPasswordStrength } from "../components/PasswordStrengthMeter.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { interviewApi } from "../api/client.js";

function Banner({ result }) {
  if (!result) return null;
  return (
    <div
      className={`mb-4 rounded-md border px-3.5 py-2.5 text-sm animate-enterUp ${
        result.ok ? "border-teal/40 bg-teal/10 text-teal" : "border-danger/40 bg-danger/10 text-danger"
      }`}
    >
      {result.message}
    </div>
  );
}

export default function Profile() {
  const { user, updateProfile, changePassword, resendVerification } = useAuth();

  // Profile details form
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileResult, setProfileResult] = useState(null);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordResult, setPasswordResult] = useState(null);

  // Verification resend
  const [resending, setResending] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // Quick stats - reuses the existing /interviews list endpoint, no new backend needed
  const [stats, setStats] = useState({ total: 0, completed: 0, avgScore: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await interviewApi.list();
        const completed = data.filter((s) => s.status === "completed" && s.overall_score != null);
        const avgScore = completed.length
          ? completed.reduce((sum, s) => sum + s.overall_score, 0) / completed.length
          : 0;
        setStats({ total: data.length, completed: completed.length, avgScore });
      } catch {
        // Non-fatal: stats card just stays at zero.
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setProfileResult({ ok: false, message: "Please enter your full name." });
      return;
    }
    setProfileSaving(true);
    const res = await updateProfile(fullName.trim());
    setProfileResult(res);
    setProfileSaving(false);
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordResult({ ok: false, message: "Fill in all three password fields." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordResult({ ok: false, message: "New passwords don't match." });
      return;
    }
    if (getPasswordStrength(newPassword) < 2) {
      setPasswordResult({ ok: false, message: "Choose a stronger new password." });
      return;
    }
    setPasswordSaving(true);
    const res = await changePassword(currentPassword, newPassword);
    setPasswordResult(res);
    setPasswordSaving(false);
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleResend() {
    setResending(true);
    const res = await resendVerification();
    setVerifyResult({ ok: true, message: res.message });
    setResending(false);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-semibold sm:text-3xl">Your profile</h1>

        {/* Account overview */}
        <div className="card mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <UserAvatar user={user} size={72} />
          <div className="min-w-0 flex-1">
            <p className="break-words font-display text-lg font-semibold">{user.full_name}</p>
            <p className="break-words text-sm text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.is_verified ? "bg-teal/15 text-teal" : "bg-gold/15 text-gold"
                }`}
              >
                {user.is_verified ? "Verified" : "Not verified"}
              </span>
              <span className="rounded-full bg-surfaceLight px-2.5 py-0.5 text-xs font-medium text-muted">
                {user.has_password ? "Email & password" : "Social sign-in"}
              </span>
              <span className="rounded-full bg-surfaceLight px-2.5 py-0.5 text-xs font-medium text-muted">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {!user.is_verified && (
          <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-md border border-gold/30 bg-gold/5 px-4 py-3 text-sm sm:flex-row sm:items-center">
            <span className="text-paper">
              {verifyResult?.message || "Your email address isn't verified yet."}
            </span>
            <button
              onClick={handleResend}
              disabled={resending}
              className="whitespace-nowrap text-xs font-medium text-gold hover:text-goldSoft"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        )}

        {/* Quick stats */}
        <div className="card mb-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-display text-2xl font-semibold text-gold">
              {statsLoading ? "…" : stats.total}
            </p>
            <p className="mt-1 text-xs text-muted">Interviews started</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-gold">
              {statsLoading ? "…" : stats.completed}
            </p>
            <p className="mt-1 text-xs text-muted">Completed</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-gold">
              {statsLoading ? "…" : stats.avgScore.toFixed(1)}
            </p>
            <p className="mt-1 text-xs text-muted">Average score</p>
          </div>
        </div>

        {/* Edit profile details */}
        <form onSubmit={handleProfileSubmit} className="card mb-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Profile details</h2>
          <Banner result={profileResult} />
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input-field opacity-60" value={user.email} disabled />
            <p className="mt-1.5 text-xs text-muted">Email address can't be changed here.</p>
          </div>
          <button type="submit" disabled={profileSaving} className="btn-primary w-full sm:w-auto">
            {profileSaving ? "Saving…" : "Save changes"}
          </button>
        </form>

        {/* Change password */}
        <div className="card">
          <h2 className="mb-4 font-display text-lg font-semibold">Password</h2>
          {user.has_password ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Banner result={passwordResult} />
              <div>
                <label className="label" htmlFor="currentPassword">Current password</label>
                <PasswordInput
                  id="currentPassword"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="newPassword">New password</label>
                <PasswordInput
                  id="newPassword"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>
              <div>
                <label className="label" htmlFor="confirmNewPassword">Confirm new password</label>
                <PasswordInput
                  id="confirmNewPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" disabled={passwordSaving} className="btn-primary w-full sm:w-auto">
                {passwordSaving ? "Updating…" : "Change password"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted">
              This account signed in with Google or GitHub, so there's no password to change here.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
