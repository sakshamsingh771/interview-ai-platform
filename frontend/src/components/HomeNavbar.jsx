import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import UserAvatar from "./UserAvatar.jsx";

const NAV_LINKS = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
];

export default function HomeNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const observerRef = useRef(null);

  // Sticky navbar gains a background + border once the hero scrolls past.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight whichever section is currently in view.
  useEffect(() => {
    const sections = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean);
    if (sections.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((s) => observerRef.current.observe(s));
    return () => observerRef.current?.disconnect();
  }, []);

  // Lock background scroll while the mobile menu is open, so the page behind
  // an open menu can't be scrolled (common source of janky mobile UX).
  useEffect(() => {
    if (menuOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = previousOverflow; };
    }
  }, [menuOpen]);

  // If the viewport crosses into desktop width while the mobile menu is open
  // (e.g. rotating a tablet, or resizing a browser window), close it - the
  // desktop nav takes over and an open mobile panel underneath it would be
  // a layout-shift/overflow trap.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handleChange = (e) => { if (e.matches) setMenuOpen(false); };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  function handleNavClick(id) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header
      className={`sticky top-0 z-20 transition-colors duration-300 ${
        scrolled ? "border-b border-border bg-ink/90 backdrop-blur" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">PrepRoom</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`relative py-1 text-sm font-medium transition-colors ${
                activeSection === link.id ? "text-gold" : "text-muted hover:text-paper"
              }`}
            >
              {link.label}
              <span
                className={`absolute -bottom-1 left-0 h-px w-full bg-gold transition-transform duration-300 origin-left ${
                  activeSection === link.id ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <UserAvatar user={user} size={28} />
              <button onClick={() => navigate("/dashboard")} className="btn-secondary !px-4 !py-2 text-sm">
                Dashboard
              </button>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-sm font-medium text-muted transition hover:text-paper"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-muted transition hover:text-paper">
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary !px-4 !py-2 text-sm">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            className="flex flex-col gap-1.5"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className={`h-0.5 w-6 bg-paper transition-transform duration-300 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-6 bg-paper transition-opacity duration-300 ${menuOpen ? "opacity-0" : "opacity-100"}`} />
            <span className={`h-0.5 w-6 bg-paper transition-transform duration-300 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu panel.
          Animated via CSS grid-template-rows (0fr -> 1fr) rather than a
          hardcoded max-height: a fixed max-height either clips content that
          grows taller than the guess, or leaves dead space when it's
          shorter. The grid technique animates to the panel's *actual*
          content height automatically, so this stays correct even if more
          links are added later. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out md:hidden ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden border-b border-border bg-ink">
          <div className="flex flex-col gap-1 px-6 pb-5 pt-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${
                activeSection === link.id ? "bg-surface text-gold" : "text-muted hover:bg-surface hover:text-paper"
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            {user ? (
              <>
                <button onClick={() => { setMenuOpen(false); navigate("/dashboard"); }} className="btn-secondary w-full">
                  Dashboard
                </button>
                <button
                  onClick={() => { setMenuOpen(false); logout(); navigate("/"); }}
                  className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-surface hover:text-paper"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary w-full">
                  Sign in
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                  Get started
                </Link>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
