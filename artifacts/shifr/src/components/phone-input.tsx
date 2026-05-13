import { useState, useRef, useCallback } from "react";
import { AsYouType, isValidPhoneNumber, isPossiblePhoneNumber } from "libphonenumber-js";

function countryToFlag(isoCode: string): string {
  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  placeholder?: string;
  isError?: boolean;
  "data-testid"?: string;
}

export function PhoneInput({
  value,
  onChange,
  onValidChange,
  placeholder = "+",
  isError = false,
  "data-testid": testId,
}: PhoneInputProps) {
  const [shaking, setShaking] = useState(false);
  const [country, setCountry] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 420);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    // Always ensure leading +
    const digitsOnly = rawInput.replace(/[^\d]/g, "");
    const withPlus = "+" + digitsOnly;

    // Check if current number is already complete
    const currentIsComplete = value.length > 1 && isPossiblePhoneNumber(value);
    const isGrowing = digitsOnly.length > value.replace(/[^\d]/g, "").length;

    if (currentIsComplete && isGrowing) {
      triggerShake();
      return;
    }

    // Format with AsYouType
    const formatter = new AsYouType();
    const formatted = formatter.input(withPlus);
    const detectedCountry = formatter.getCountry();
    setCountry(detectedCountry ?? undefined);

    onChange(formatted === "+" ? "+" : formatted);
    onValidChange?.(isValidPhoneNumber(formatted));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent deleting the leading +
    if (e.key === "Backspace" && value === "+") {
      e.preventDefault();
    }
  };

  const errorOrShake = isError || shaking;

  return (
    <div className="relative">
      {country && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none select-none z-10">
          {countryToFlag(country)}
        </span>
      )}
      <input
        ref={inputRef}
        data-testid={testId}
        type="tel"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={[
          "w-full bg-black/50 text-primary placeholder:text-primary/30 font-mono text-lg outline-none transition-all duration-150 px-4 py-3 border",
          country ? "pl-10" : "",
          errorOrShake
            ? "border-destructive shadow-[0_0_8px_rgba(255,50,50,0.5)]"
            : "border-primary/30 focus:border-primary/70 shadow-[0_0_0px_transparent]",
          shaking ? "animate-shake" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  );
}

export { isValidPhoneNumber, isPossiblePhoneNumber };
