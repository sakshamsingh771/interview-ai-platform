import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import HomeNavbar from "../components/HomeNavbar.jsx";
import AnimatedBackground from "../components/AnimatedBackground.jsx";
import ContactForm from "../components/ContactForm.jsx";

const FEATURES = [
  {
    title: "AI-generated questions",
    body: "Tell it the role, topic, and difficulty. Claude writes a fresh set of interview questions every time — no repeated question banks.",
  },
  {
    title: "Instant, specific feedback",
    body: "Every answer gets scored 0–10 with two to four sentences of concrete, actionable feedback — not just a number.",
  },
  {
    title: "Readiness tracking",
    body: "Your dashboard shows a running average across every completed session, so you can see progress instead of guessing at it.",
  },
  {
    title: "Resume anytime",
    body: "Leave mid-interview and pick up exactly where you stopped. Nothing is lost between sessions.",
  },
];

const STEPS = [
  { step: "01", title: "Set up a session", body: "Pick a target role, a topic, and how hard you want it to be." },
  { step: "02", title: "Answer questions", body: "Work through them one at a time, at your own pace, in your own words." },
  { step: "03", title: "Get scored", body: "Each answer is graded immediately, then you get a closing summary at the end." },
];

// Product-capability stats - things that are actually true about what the
// app does, not fabricated usage numbers (no real user base to report yet).
const STATS = [
  { value: "24/7", label: "Available whenever you want to practice" },
  { value: "3", label: "Difficulty tiers, easy to hard" },
  { value: "0–10", label: "Granular scoring on every answer" },
  { value: "∞", label: "Sessions - practice as many times as you want" },
];

// Sample testimonials illustrating the intended tone/format for this section.
// Swap these for real quotes once you have them.
const TESTIMONIALS = [
  {
    quote: "Running through a few of these before a real interview made the actual thing feel a lot less unfamiliar.",
    name: "Early tester",
    role: "Backend Engineer candidate",
  },
  {
    quote: "The per-answer feedback is what did it for me — I could see exactly which parts of an answer were weak.",
    name: "Early tester",
    role: "System Design practice",
  },
  {
    quote: "Being able to leave and resume later meant I actually finished a full session instead of giving up halfway.",
    name: "Early tester",
    role: "Product Manager candidate",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything you need to start practicing today.",
    features: ["Unlimited mock interviews", "AI-generated questions", "Instant scored feedback", "Full session history"],
    cta: "Get started free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "—",
    period: "coming soon",
    tagline: "For candidates who want deeper, resume-aware prep.",
    features: ["Everything in Free", "Resume-aware questions", "Detailed skill reports", "Priority AI response times"],
    cta: "Join the waitlist",
    highlighted: true,
  },
  {
    name: "Team",
    price: "Let's talk",
    period: "",
    tagline: "For bootcamps and career centers preparing groups of candidates.",
    features: ["Everything in Pro", "Multiple learner seats", "Progress overview across a cohort", "Dedicated support"],
    cta: "Contact us",
    highlighted: false,
  },
];

const FAQS = [
  {
    q: "Do I need my own API key?",
    a: "No — PrepRoom works out of the box. If an Anthropic API key is configured on the backend you get real AI-generated questions and grading; otherwise it runs in a offline demo mode so you can still explore the flow.",
  },
  {
    q: "Can I revisit old interviews?",
    a: "Yes. Every session — in progress or completed — stays on your dashboard with its score and full question history.",
  },
  {
    q: "What roles and topics are supported?",
    a: "Any. The role and topic are free-text, so you can target anything from \"Backend Engineer / System Design\" to \"Product Manager / Stakeholder Communication.\"",
  },
  {
    q: "Is my account secure?",
    a: "Passwords are hashed, access is via short-lived tokens with revocable refresh tokens, and sign-up/login/reset endpoints are all rate-limited against brute-force attempts.",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <HomeNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <AnimatedBackground />
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:pt-24">
          
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Practice interviews that actually{" "}
            <span className="text-gold">talk back.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
            PrepRoom runs realistic mock interviews for any role and topic, scores every
            answer instantly, and tracks your readiness over time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={user ? "/dashboard" : "/signup"} className="btn-primary w-full sm:w-auto">
              {user ? "Go to dashboard" : "Start your first interview"}
            </Link>
            <button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-secondary w-full sm:w-auto"
            >
              See how it works
            </button>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-semibold text-gold">{s.value}</p>
              <p className="mt-1 text-xs leading-snug text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-2xl font-semibold">Built for repeated practice</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Everything you need to run interview after interview, without it getting stale.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3 className="font-display text-base font-semibold text-gold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-2xl font-semibold">Three steps, start to finish</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="card">
              <span className="font-mono text-sm text-gold">{s.step}</span>
              <h3 className="mt-2 font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-2xl font-semibold">What early testers say</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="card flex flex-col justify-between">
              <p className="text-sm leading-relaxed text-paper">"{t.quote}"</p>
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-2xl font-semibold">Simple, honest pricing</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Start free. Nothing here charges a card behind the scenes.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PRICING.map((p) => (
            <div
              key={p.name}
              className={`card flex flex-col ${p.highlighted ? "border-gold/60 shadow-glow" : ""}`}
            >
              {p.highlighted && (
                <span className="mb-3 inline-flex w-fit items-center rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">
                  Most requested
                </span>
              )}
              <h3 className="font-display text-lg font-semibold">{p.name}</h3>
              <p className="mt-2">
                <span className="font-display text-3xl font-semibold">{p.price}</span>
                {p.period && <span className="ml-1.5 text-sm text-muted">/ {p.period}</span>}
              </p>
              <p className="mt-2 text-sm text-muted">{p.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-teal">✓</span>
                    <span className="text-paper">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={p.name === "Team" ? "#contact" : user ? "/dashboard" : "/signup"}
                onClick={(e) => {
                  if (p.name === "Team") {
                    e.preventDefault();
                    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className={`mt-6 ${p.highlighted ? "btn-primary" : "btn-secondary"}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-2xl font-semibold">Frequently asked</h2>
        <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-surface">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}
                <span className="ml-4 text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-2xl scroll-mt-20 px-6 py-16">
        <h2 className="text-center font-display text-2xl font-semibold">Get in touch</h2>
        <p className="mt-2 text-center text-sm text-muted">
          Questions, feedback, or partnership ideas — send a message and we'll reply by email.
        </p>
        <div className="mt-8">
          <ContactForm />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="card flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="font-display text-xl font-semibold">Ready to run your first session?</h2>
            <p className="mt-1 text-sm text-muted">It takes less than a minute to get your first question.</p>
          </div>
          <Link to={user ? "/dashboard" : "/signup"} className="btn-primary whitespace-nowrap">
            {user ? "Go to dashboard" : "Get started free"}
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted">
        PrepRoom — an AI interview coach built with FastAPI, PostgreSQL, and React.
      </footer>
    </div>
  );
}
