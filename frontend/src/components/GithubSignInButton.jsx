const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "";

function buildGithubAuthUrl() {
  const redirectUri = `${window.location.origin}/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    // Round-trip the page the user started from so the callback can send
    // them back to something sensible (defaults to /dashboard).
    state: window.location.pathname,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export default function GithubSignInButton() {
  if (!GITHUB_CLIENT_ID) {
    return (
      <div className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-center text-xs text-muted">
        GitHub sign-in isn't configured on this deployment yet.
      </div>
    );
  }

  return (
    <a
      href={buildGithubAuthUrl()}
      className="btn-secondary w-full !gap-2.5"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.1 11.1 0 015.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.41-2.7 5.39-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A10.52 10.52 0 0023.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
      Continue with GitHub
    </a>
  );
}
