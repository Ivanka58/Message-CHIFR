import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLang } from "../../lib/lang";
import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Panic() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const [panicCode, setPanicCode] = useState("");

  const handlePanic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!panicCode) return;
    localStorage.clear();
    setLocation("/");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 relative z-10 h-full overflow-y-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="text-xs font-mono text-destructive/50 hover:text-destructive uppercase tracking-widest transition-colors"
        >
          {t.settingsBack}
        </Link>
      </div>

      <div className="flex items-center gap-4 border-b border-destructive/30 pb-6">
        <div className="w-12 h-12 flex items-center justify-center bg-destructive/10 border border-destructive/30 text-destructive">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-mono text-destructive font-bold uppercase tracking-widest drop-shadow-[0_0_6px_rgba(255,50,50,0.5)]">
            {t.panicTitle}
          </h1>
          <p className="text-destructive/50 font-mono text-xs uppercase mt-1">{t.panicSubDesc}</p>
        </div>
      </div>

      <div className="space-y-6 bg-destructive/5 border border-destructive/30 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.04)_10px,rgba(255,0,0,0.04)_20px)] pointer-events-none" />
        <p className="text-sm font-mono text-destructive/80 relative z-10 leading-relaxed">{t.panicDesc}</p>

        <form onSubmit={handlePanic} className="space-y-4 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-mono text-destructive/80 uppercase tracking-widest">{t.panicLabel}</label>
            <Input
              data-testid="input-panic"
              type="text"
              value={panicCode}
              onChange={(e) => setPanicCode(e.target.value)}
              placeholder={t.panicPlaceholder}
              className="bg-black border-destructive/50 text-destructive placeholder:text-destructive/30 focus-visible:ring-destructive/50 font-mono rounded-none"
            />
          </div>
          <Button
            data-testid="button-panic"
            type="submit"
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-none font-mono uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(255,0,0,0.4)] hover:shadow-[0_0_25px_rgba(255,0,0,0.6)] transition-all"
          >
            {t.panicBtn}
          </Button>
        </form>
      </div>
    </div>
  );
}
