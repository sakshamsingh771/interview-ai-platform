import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import UserAvatar from "./UserAvatar.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-ink/95 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gold shadow-glow" />
          <span className="font-display text-lg font-semibold tracking-tight">PrepRoom</span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-medium text-muted transition hover:text-paper">
              Dashboard
            </Link>
            <Link to="/profile" className="flex items-center gap-2.5">
              <UserAvatar user={user} size={30} />
              <span className="hidden text-sm text-muted sm:inline">{user.full_name}</span>
            </Link>
            <ThemeToggle />
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-sm font-medium text-muted transition hover:text-paper"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
