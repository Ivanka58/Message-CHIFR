import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useSession } from "../lib/session";
import { useLogin, useVerifyCode } from "@workspace/api-client-react";
import { Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { session, setSession } = useSession();
  const [, setLocation] = useLocation();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [demoCode, setDemoCode] = useState("");

  const loginMutation = useLogin();
  const verifyMutation = useVerifyCode();

  useEffect(() => {
    if (session) {
      setLocation("/chat");
    }
  }, [session, setLocation]);

  // Digital Rain Effect
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
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(0, 5, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00ff64";
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    loginMutation.mutate({ data: { phone } }, {
      onSuccess: (data) => {
        setDemoCode(data.code);
        setStep("code");
      }
    });
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    verifyMutation.mutate({ data: { phone, code } }, {
      onSuccess: (data) => {
        setSession(data);
        setLocation("/chat");
      }
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-background flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40"></canvas>
      
      <div className="relative z-10 w-full max-w-md p-8 bg-black/60 backdrop-blur-md border border-primary/50 shadow-[0_0_30px_rgba(0,255,100,0.15)]">
        <div className="flex flex-col items-center mb-8">
          <Shield className="w-16 h-16 text-primary mb-4 drop-shadow-[0_0_10px_rgba(0,255,100,0.8)]" />
          <h1 className="text-4xl font-bold tracking-widest text-primary uppercase text-center font-mono">SHIFR</h1>
          <p className="mt-2 text-sm text-primary/70 font-mono tracking-widest uppercase type-effect">Secure. Anonymous. Untraceable.</p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70 uppercase">Enter Node Access Number</label>
              <Input 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="+1 (555) 000-0000" 
                className="bg-black/50 border-primary/30 text-primary placeholder:text-primary/30 focus-visible:ring-primary font-mono text-lg rounded-none"
              />
            </div>
            <Button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="w-full bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-black rounded-none font-mono tracking-widest uppercase"
            >
              {loginMutation.isPending ? "Connecting..." : "Initiate Handshake"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70 uppercase">Verification Matrix Required</label>
              <Input 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                placeholder="A-XXXXXX" 
                className="bg-black/50 border-primary/30 text-primary placeholder:text-primary/30 focus-visible:ring-primary font-mono text-lg rounded-none"
              />
              <p className="text-xs text-primary/50 font-mono mt-2">Intercepted code: {demoCode}</p>
            </div>
            <Button 
              type="submit" 
              disabled={verifyMutation.isPending}
              className="w-full bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-black rounded-none font-mono tracking-widest uppercase"
            >
              {verifyMutation.isPending ? "Decrypting..." : "Establish Secure Link"}
            </Button>
          </form>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .type-effect {
          overflow: hidden;
          white-space: nowrap;
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