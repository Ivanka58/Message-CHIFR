import { useState } from "react";
import { useLocation } from "wouter";
import { useLang } from "../lib/lang";
import { ShieldAlert, KeyRound, HardDrive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const [panicCode, setPanicCode] = useState("");
  const [primaryPassword, setPrimaryPassword] = useState(localStorage.getItem("shifr_pw1") || "");
  const [secondaryPassword, setSecondaryPassword] = useState(localStorage.getItem("shifr_pw2") || "");

  const handlePanic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!panicCode) return;
    localStorage.clear();
    setLocation("/");
  };

  const handleSavePasswords = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("shifr_pw1", primaryPassword);
    localStorage.setItem("shifr_pw2", secondaryPassword);
    alert(t.keysUpdated);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 relative z-10 h-full overflow-y-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-mono text-primary font-bold uppercase border-b border-primary/20 pb-4 inline-block pr-12">{t.settingsTitle}</h1>
        <p className="text-primary/50 font-mono text-sm uppercase">{t.settingsSubtitle}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Двойное дно */}
        <section className="space-y-6 bg-black/40 border border-primary/20 p-6">
          <div className="flex items-center gap-3 text-primary border-b border-primary/20 pb-4">
            <HardDrive className="w-5 h-5" />
            <h2 className="font-mono text-xl uppercase tracking-wider">{t.doubleBottomTitle}</h2>
          </div>
          <p className="text-sm font-mono text-primary/60">{t.doubleBottomDesc}</p>
          <form onSubmit={handleSavePasswords} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70 uppercase">{t.primaryKey}</label>
              <Input
                data-testid="input-primary-key"
                type="password"
                value={primaryPassword}
                onChange={(e) => setPrimaryPassword(e.target.value)}
                className="bg-black/50 border-primary/30 text-primary font-mono rounded-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70 uppercase">{t.secondaryKey}</label>
              <Input
                data-testid="input-secondary-key"
                type="password"
                value={secondaryPassword}
                onChange={(e) => setSecondaryPassword(e.target.value)}
                className="bg-black/50 border-primary/30 text-primary font-mono rounded-none"
              />
            </div>
            <Button data-testid="button-commit-keys" type="submit" className="w-full bg-primary/10 text-primary border border-primary/50 hover:bg-primary hover:text-black rounded-none font-mono uppercase mt-4">
              {t.commitKeys}
            </Button>
          </form>
        </section>

        {/* Панический код */}
        <section className="space-y-6 bg-destructive/10 border border-destructive/30 p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.05)_10px,rgba(255,0,0,0.05)_20px)] pointer-events-none"></div>
          <div className="flex items-center gap-3 text-destructive border-b border-destructive/30 pb-4 relative z-10">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="font-mono text-xl uppercase tracking-wider text-destructive drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]">{t.panicTitle}</h2>
          </div>
          <p className="text-sm font-mono text-destructive/80 relative z-10">{t.panicDesc}</p>
          <form onSubmit={handlePanic} className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-mono text-destructive/80 uppercase">{t.panicLabel}</label>
              <Input
                data-testid="input-panic"
                type="text"
                value={panicCode}
                onChange={(e) => setPanicCode(e.target.value)}
                placeholder={t.panicPlaceholder}
                className="bg-black border-destructive/50 text-destructive focus-visible:ring-destructive/50 font-mono rounded-none"
              />
            </div>
            <Button data-testid="button-panic" type="submit" className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-none font-mono uppercase tracking-widest font-bold mt-4 shadow-[0_0_15px_rgba(255,0,0,0.4)] hover:shadow-[0_0_25px_rgba(255,0,0,0.6)] transition-all">
              {t.panicBtn}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
