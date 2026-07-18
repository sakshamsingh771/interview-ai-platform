import { createContext, useContext, useState, useCallback } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const persist = (accessToken, refreshToken, userData) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const signup = useCallback(async (fullName, email, password) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await authApi.signup({ full_name: fullName, email, password });
      persist(data.access_token, data.refresh_token, data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create your account. Try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await authApi.login(email, password);
      persist(data.access_token, data.refresh_token, data.user);
      return true;
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
      } else {
        setError(err.response?.data?.detail || "Incorrect email or password.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await authApi.google(idToken);
      persist(data.access_token, data.refresh_token, data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Could not sign in with Google. Try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGithub = useCallback(async (code) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await authApi.github(code);
      persist(data.access_token, data.refresh_token, data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Could not sign in with GitHub. Try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      // Best-effort server-side revocation; don't block the UI on it.
      authApi.logout(refreshToken).catch(() => {});
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const resendVerification = useCallback(async () => {
    try {
      await authApi.resendVerification();
      return { ok: true, message: "Verification email sent." };
    } catch (err) {
      return { ok: false, message: err.response?.data?.detail || "Could not send verification email." };
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      const { data } = await authApi.forgotPassword(email);
      return { ok: true, message: data.message };
    } catch (err) {
      return { ok: false, message: err.response?.data?.detail || "Something went wrong." };
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      const { data } = await authApi.resetPassword(token, newPassword);
      return { ok: true, message: data.message };
    } catch (err) {
      return { ok: false, message: err.response?.data?.detail || "That reset link is invalid or expired." };
    }
  }, []);

  const updateProfile = useCallback(async (fullName) => {
    try {
      const { data } = await authApi.updateProfile(fullName);
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      return { ok: true, message: "Profile updated." };
    } catch (err) {
      return { ok: false, message: err.response?.data?.detail || "Could not update your profile." };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const { data } = await authApi.changePassword(currentPassword, newPassword);
      return { ok: true, message: data.message };
    } catch (err) {
      return { ok: false, message: err.response?.data?.detail || "Could not change your password." };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, loading, error, setError,
        signup, login, loginWithGoogle, loginWithGithub, logout,
        resendVerification, forgotPassword, resetPassword,
        updateProfile, changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
