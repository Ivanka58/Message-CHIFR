import { useState, useRef, useEffect, useCallback } from "react";

interface CodeInputProps {
  value: string;
  onChange: (raw: string) => void;
  isError?: boolean;
  "data-testid"?: string;
}

/**
 * Enforces the format A-XXXXXX:
 *  - raw[0]    = letter (auto-uppercased)
 *  - raw[1..6] = digits
 *  - Displayed as: "A-123456"
 *
 * Uses onChange (not onKeyDown) so it works on mobile keyboards too.
 */
export function CodeInput({ value, onChange, isError = false, "data-testid": testId }: CodeInputProps) {
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsError = useRef(false);

  // Auto-focus when mounted
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const triggerShake = useCallback(() => {
    setShaking(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setShaking(true);
        setTimeout(() => setShaking(false), 450);
      })
    );
  }, []);

  // Shake when parent signals error
  useEffect(() => {
    if (isError && !prevIsError.current) triggerShake();
    prevIsError.current = isError;
  }, [isError, triggerShake]);

  // Display: insert dash after first char
  const displayValue =
    value.length === 0 ? "" : value.length === 1 ? value[0] : value[0] + "-" + value.slice(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip dashes from whatever the browser produced
    const raw = e.target.value.replace(/-/g, "").replace(/\s/g, "");

    let processed = "";
    let invalid = false;

    for (let i = 0; i < raw.length; i++) {
      if (i >= 7) break; // max 7 chars (1 letter + 6 digits)
      if (i === 0) {
        if (/[a-zA-Z]/.test(raw[i])) {
          processed += raw[i].toUpperCase();
        } else {
          invalid = true;
          break;
        }
      } else {
        if (/\d/.test(raw[i])) {
          processed += raw[i];
        } else {
          invalid = true;
          break;
        }
      }
    }

    if (invalid) {
      triggerShake();
      // Keep existing value — don't update
      return;
    }

    onChange(processed);
  };

  // Fallback: also handle keydown for UX (backspace etc.)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") return; // allow form submit
    if (value.length >= 7 && e.key !== "Backspace" && e.key !== "Delete" && !e.ctrlKey && !e.metaKey) {
      if (e.key.length === 1) {
        e.preventDefault();
        triggerShake();
      }
    }
  };

  const hasError = isError || shaking;

  return (
    <input
      ref={inputRef}
      data-testid={testId}
      type="text"
      inputMode="text"
      autoComplete="one-time-code"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="A-XXXXXX"
      maxLength={8}
      className={[
        "w-full bg-black/50 text-primary placeholder:text-primary/30 font-mono text-lg outline-none transition-colors duration-150 px-4 py-3 border tracking-widest",
        hasError
          ? "border-destructive shadow-[0_0_8px_rgba(255,50,50,0.5)]"
          : "border-primary/30 focus:border-primary/70",
        shaking ? "animate-shake" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
