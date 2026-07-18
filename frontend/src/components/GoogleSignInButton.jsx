import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function GoogleSignInButton() {
  const { loginWithGoogle, setError } = useAuth();
  const navigate = useNavigate();

  if (!GOOGLE_CONFIGURED) {
    return (
      <div className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-center text-xs text-muted">
        Google sign-in isn't configured on this deployment yet.
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        theme="filled_black"
        shape="pill"
        text="continue_with"
        onSuccess={async (credentialResponse) => {
          const ok = await loginWithGoogle(credentialResponse.credential);
          if (ok) navigate("/dashboard");
        }}
        onError={() => setError("Google sign-in failed. Please try again.")}
      />
    </div>
  );
}
