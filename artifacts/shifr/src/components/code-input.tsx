import { useState, useRef, useCallback } from "react";

interface CodeInputProps {
  value: string;
  onChange: (raw: string) => void;
  isError?: boolean;
  "data-testid"?: string;
}

/**
 * Enforces the format A-XXXXXX:
 *  - raw[0]   = letter (auto-uppercased)
 *  - raw[1..6] = digits
 *  - Displayed as: "A-123456"
 */
export function CodeInput({ value, onChange, isError = false, "data-testid": testId }: CodeInputProps) {
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 420);
  }, []);

  // Display value: insert dash after first char
  const displayValue =
    value.length === 0
      ? ""
      : value.length === 1
        ? value[0]
        : value[0] + "-" + value.slice(1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (e.key === "Backspace") {
      onChange(value.slice(0, -1));
      return;
    }

    // Only handle printable single characters
    if (e.key.length !== 1) return;

    const ch = e.key;

    if (value.length === 0) {
      // Position 0: must be a letter
      if (/[a-zA-Z]/.test(ch)) {
        onChange(ch.toUpperCase());
      } else {
        triggerShake();
      }
    } else if (value.length < 7) {
      // Positions 1-6: must be digits
      if (/\d/.test(ch)) {
        onChange(value + ch);
      } else {
        triggerShake();
      }
    } else {
      // Max length reached
      triggerShake();
    }
  };

  const errorOrShake = isError || shaking;

  return (
    <input
      ref={inputRef}
      data-testid={testId}
      type="text"
      value={displayValue}
      onChange={() => {}}
      onKeyDown={handleKeyDown}
      placeholder="A-XXXXXX"
      maxLength={8}
      className={[
        "w-full bg-black/50 text-primary placeholder:text-primary/30 font-mono text-lg outline-none transition-all duration-150 px-4 py-3 border tracking-widest",
        errorOrShake
          ? "border-destructive shadow-[0_0_8px_rgba(255,50,50,0.5)]"
          : "border-primary/30 focus:border-primary/70",
        shaking ? "animate-shake" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
