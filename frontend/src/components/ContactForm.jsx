import { useState } from "react";
import { contactApi } from "../api/client.js";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await contactApi.submit(form);
      setResult({ ok: true, message: data.message });
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setResult({
        ok: false,
        message:
          err.response?.status === 429
            ? "Too many messages sent - please try again in a minute."
            : Array.isArray(detail)
            ? "Please check your details and try again."
            : detail || "Could not send your message. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            required
            minLength={2}
            className="input-field"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            type="email"
            required
            className="input-field"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          required
          minLength={10}
          className="input-field min-h-[120px] resize-y"
          placeholder="What's on your mind?"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
