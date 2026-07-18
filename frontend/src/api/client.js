import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight = null;

async function performRefresh() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
    localStorage.setItem("access_token", data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

function clearSessionAndRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt one silent refresh-and-retry per request, and never for
    // the auth endpoints themselves (that would loop).
    const isAuthEndpoint = original?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true;

      // Coalesce concurrent 401s into a single refresh call.
      refreshInFlight = refreshInFlight || performRefresh();
      const newAccessToken = await refreshInFlight;
      refreshInFlight = null;

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return client(original);
      }
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: (data) => client.post("/auth/signup", data),
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return client.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  me: () => client.get("/auth/me"),
  google: (idToken) => client.post("/auth/google", { id_token: idToken }),
  github: (code) => client.post("/auth/github", { code }),
  logout: (refreshToken) => client.post("/auth/logout", { refresh_token: refreshToken }),
  verifyEmail: (token) => client.post("/auth/verify-email", { token }),
  resendVerification: () => client.post("/auth/resend-verification"),
  forgotPassword: (email) => client.post("/auth/forgot-password", { email }),
  resetPassword: (token, newPassword) =>
    client.post("/auth/reset-password", { token, new_password: newPassword }),
  updateProfile: (fullName) => client.patch("/auth/me", { full_name: fullName }),
  changePassword: (currentPassword, newPassword) =>
    client.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword }),
};

export const interviewApi = {
  create: (data) => client.post("/interviews/", data),
  list: () => client.get("/interviews/"),
  get: (id) => client.get(`/interviews/${id}`),
  submitAnswer: (sessionId, questionId, content) =>
    client.post(`/interviews/${sessionId}/questions/${questionId}/answer`, { content }),
  complete: (sessionId) => client.post(`/interviews/${sessionId}/complete`),
  remove: (sessionId) => client.delete(`/interviews/${sessionId}`),
};

export const contactApi = {
  submit: (data) => client.post("/contact/", data),
};

export default client;
