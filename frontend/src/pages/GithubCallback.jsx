import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function GithubCallback() {
  const { loginWithGithub } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const exchanged = useRef(false); // StrictMode double-invokes effects - guard against exchanging the code twice

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const code = searchParams.get("code");
    const returnTo = searchParams.get("state") || "/dashboard";

    if (!code) {
      setError("Missing GitHub authorization code.");
      return;
    }

    (async () => {
      const ok = await loginWithGithub(code);
      navigate(ok ? returnTo : "/login", { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="card max-w-sm">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : (
          <p className="text-sm text-muted">Finishing GitHub sign-in…</p>
        )}
      </div>
    </div>
  );
}
