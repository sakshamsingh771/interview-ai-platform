// Simple heuristic strength score (0-4), not a security guarantee - just
// enough to nudge people away from "password1" toward something better.
export function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: "Very weak", color: "bg-danger" },
  { label: "Weak", color: "bg-danger" },
  { label: "Fair", color: "bg-gold" },
  { label: "Good", color: "bg-gold" },
  { label: "Strong", color: "bg-teal" },
];

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  const level = LEVELS[strength];

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < strength ? level.color : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">{level.label}</p>
    </div>
  );
}
