import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useSession } from "../lib/session";
import { useLang } from "../lib/lang";
import { useLogin, useVerifyCode } from "@workspace/api-client-react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput, isValidPhoneNumber } from "../components/phone-input";
import { CodeInput } from "../components/code-input";

export default function Login() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { session, setSession } = useSession();
  const [, setLocation] = useLocation();
  const { t, toggleLang } = useLang();

  const [phone, setPhone] = useState("+");
  const [rawCode, setRawCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [demoCode, setDemoCode] = useState("");

  const [phoneError, setPhoneError] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [phoneShaking, setPhoneShaking] = useState(false);
  const [codeShaking, setCodeShaking] = useState(false);

  const loginMutation = useLogin();
  const verifyMutation = useVerifyCode();

  useEffect(() => {
    if (session) setLocation("/chat");
  }, [session, setLocation]);

  // Digital rain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const katakana = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン";
    const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const alphabet = katakana + latin + nums;
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops: number[] = Array.from({ length: Math.ceil(columns) }, () => 1);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 5, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff64";
      ctx.font = fontSize + "px monospace";
      for (let i = 0; i < drops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { clearInterval(interval); window.removeEventListener("resize", handleResize); };
  }, []);

  const triggerPhoneShake = () => {
    setPhoneError(true);
    setPhoneShaking(true);
    setTimeout(() => setPhoneShaking(false), 420);
  };

  const triggerCodeShake = () => {
    setCodeError(true);
    setCodeShaking(true);
    setTimeout(() => setCodeShaking(false), 420);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhoneNumber(phone)) {
      triggerPhoneShake();
      return;
    }
    setPhoneError(false);
    loginMutation.mutate({ data: { phone } }, {
      onSuccess: (data) => { setDemoCode(data.code); setStep("code"); },
    });
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // rawCode must be exactly 7 chars: 1 letter + 6 digits
    if (rawCode.length < 7) {
      triggerCodeShake();
      return;
    }
    const formatted = rawCode[0] + "-" + rawCode.slice(1);
    setCodeError(false);
    verifyMutation.mutate({ data: { phone, code: formatted } }, {
      onSuccess: (data) => { setSession(data); setLocation("/chat"); },
      onError: () => { triggerCodeShake(); },
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-background flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40" />

      <div className="relative z-10 w-full max-w-md p-8 bg-black/60 backdrop-blur-md border border-primary/50 shadow-[0_0_30px_rgba(0,255,100,0.15)]">
        <div className="flex flex-col items-center mb-8">
          <Shield className="w-16 h-16 text-primary mb-4 drop-shadow-[0_0_10px_rgba(0,255,100,0.8)]" />
          <h1 className="text-4xl font-bold tracking-widest text-primary uppercase text-center font-mono">SHIFR</h1>
          <p className="mt-2 text-sm text-primary/70 font-mono tracking-widest uppercase type-effect">{t.slogan}</p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-6" data-testid="form-phone">
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70 uppercase tracking-widest">{t.phoneLabel}</label>
              <PhoneInput
                data-testid="input-phone"
                value={phone}
                onChange={(v) => { setPhone(v); setPhoneError(false); }}
                isError={phoneShaking}
              />
              {phoneError && !phoneShaking && (
                <p className="text-xs text-destructive font-mono mt-1">{t.invalidPhone}</p>
              )}
            </div>
            <Button
              data-testid="button-initiate"
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-black rounded-none font-mono tracking-widest uppercase"
            >
              {loginMutation.isPending ? t.initiating : t.initiateBtn}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4" data-testid="form-code">
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70 uppercase tracking-widest">{t.codeLabel}</label>
              <CodeInput
                data-testid="input-code"
                value={rawCode}
                onChange={(v) => { setRawCode(v); setCodeError(false); }}
                isError={codeShaking}
              />
              {codeError && !codeShaking ? (
                <p className="text-xs text-destructive font-mono mt-1">{t.invalidCode}</p>
              ) : (
                <p className="text-xs text-primary/50 font-mono mt-1">{t.codeHint} {demoCode}</p>
              )}
            </div>
            <Button
              data-testid="button-verify"
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-black rounded-none font-mono tracking-widest uppercase"
            >
              {verifyMutation.isPending ? t.verifying : t.verifyBtn}
            </Button>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-primary/10 flex justify-center">
          <button
            data-testid="button-lang-toggle"
            onClick={toggleLang}
            className="text-xs font-mono text-primary/40 hover:text-primary/80 uppercase tracking-widest transition-colors"
          >
            {t.langToggle}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .type-effect {
          overflow: hidden; white-space: nowrap;
          border-right: 2px solid hsl(var(--primary));
          width: 0;
          animation: typing 3s steps(40, end) forwards, blink 1s step-end infinite;
        }
        @keyframes typing { from { width: 0 } to { width: 100% } }
        @keyframes blink { 50% { border-color: transparent } }
      `}} />
    </div>
  );
}
