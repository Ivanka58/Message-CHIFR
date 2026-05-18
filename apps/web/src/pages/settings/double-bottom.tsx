import { useState } from "react";
import { Link } from "wouter";
import { useLang } from "../../lib/lang";
import { HardDrive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DoubleBottom() {
  const { t } = useLang();
  const [primaryPassword, setPrimaryPassword] = useState(localStorage.getItem("shifr_pw1") || "");
  const [secondaryPassword, setSecondaryPassword] = useState(localStorage.getItem("shifr_pw2") || "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("shifr_pw1", primaryPassword);
    localStorage.setItem("shifr_pw2", secondaryPassword);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 relative z-10 h-full overflow-y-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="text-xs font-mono text-primary/50 hover:text-primary uppercase tracking-widest transition-colors"
        >
          {t.settingsBack}
        </Link>
      </div>

      <div className="flex items-center gap-4 border-b border-primary/20 pb-6">
        <div className="w-12 h-12 flex items-center justify-center bg-primary/10 border border-primary/30 text-primary">
          <HardDrive className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-mono text-primary font-bold uppercase tracking-widest">{t.doubleBottomTitle}</h1>
          <p className="text-primary/50 font-mono text-xs uppercase mt-1">{t.doubleBottomDesc}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 bg-black/40 border border-primary/20 p-6">
        <div className="space-y-2">
          <label className="text-xs font-mono text-primary/70 uppercase tracking-widest">{t.primaryKey}</label>
          <Input
            data-testid="input-primary-key"
            type="password"
            value={primaryPassword}
            onChange={(e) => setPrimaryPassword(e.target.value)}
            className="bg-black/50 border-primary/30 text-primary font-mono rounded-none focus-visible:ring-primary/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-mono text-primary/70 uppercase tracking-widest">{t.secondaryKey}</label>
          <Input
            data-testid="input-secondary-key"
            type="password"
            value={secondaryPassword}
            onChange={(e) => setSecondaryPassword(e.target.value)}
            className="bg-black/50 border-primary/30 text-primary font-mono rounded-none focus-visible:ring-primary/50"
          />
        </div>
        <Button
          data-testid="button-commit-keys"
          type="submit"
          className="w-full bg-primary/10 text-primary border border-primary/50 hover:bg-primary hover:text-black rounded-none font-mono uppercase tracking-widest"
        >
          {saved ? "✓ " + t.keysUpdated : t.commitKeys}
        </Button>
      </form>
    </div>
  );
}
