import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../api/client.js";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    (async () => {
      try {
        const { data } = await authApi.verifyEmail(token);
        setStatus("success");
        setMessage(data.message);
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.detail || "This link is invalid or has expired.");
      }
    })();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="card max-w-sm">
        {status === "verifying" && <p className="text-sm text-muted">Verifying your email…</p>}
        {status === "success" && (
          <>
            <p className="mb-2 font-display text-lg font-semibold text-teal">Email verified</p>
            <p className="text-sm text-muted">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="mb-2 font-display text-lg font-semibold text-danger">Verification failed</p>
            <p className="text-sm text-muted">{message}</p>
          </>
        )}
        <Link to="/dashboard" className="btn-secondary mt-6 inline-flex">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
