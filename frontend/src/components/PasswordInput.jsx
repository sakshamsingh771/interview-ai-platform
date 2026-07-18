import { useState } from "react";

export default function PasswordInput({ id, value, onChange, placeholder, autoComplete, error, ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`input-field pr-11 ${error ? "border-danger focus:border-danger" : ""}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors duration-200 hover:text-gold"
        >
          {/* Cross-fade between eye / eye-off so the toggle feels smooth rather than an instant swap. */}
          <span className="relative block h-[18px] w-[18px]">
            <svg
              className={`absolute inset-0 transition-opacity duration-200 ${visible ? "opacity-0" : "opacity-100"}`}
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg
              className={`absolute inset-0 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.3 20.3 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 7 11 7a20.3 20.3 0 01-3.22 4.19M14.12 14.12a3 3 0 11-4.24-4.24" />
              <path strokeLinecap="round" d="M1 1l22 22" />
            </svg>
          </span>
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
