import { useState } from "react";
import { useSession } from "../lib/session";
import { useLang } from "../lib/lang";
import { Edit2, Check, X, Zap, Shield, Lock, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AvatarLarge({ name }: { name: string }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center bg-primary/10 border-2 border-primary/50 shadow-[0_0_20px_rgba(0,255,100,0.3)]">
      <span className="font-mono font-bold text-4xl text-primary select-none">{getInitials(name)}</span>
      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-none shadow-[0_0_6px_rgba(0,255,100,0.8)]" />
    </div>
  );
}

export default function Profile() {
  const { session, logout } = useSession();
  const { t } = useLang();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("shifr_display_name") || session?.name || ""
  );
  const [draft, setDraft] = useState(displayName);
  const [saved, setSaved] = useState(false);

  if (!session) return null;

  const handleSave = () => {
    const trimmed = draft.trim() || session.name;
    setDisplayName(trimmed);
    localStorage.setItem("shifr_display_name", trimmed);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setDraft(displayName);
    setEditing(false);
  };

  const sessionShort = session.sessionId?.slice(0, 8).toUpperCase() ?? "--------";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 relative z-10 h-full overflow-y-auto pb-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-5 py-6 border border-primary/20 bg-black/40 px-6">
        <AvatarLarge name={displayName} />

        {editing ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
              className="bg-black/50 border-primary/50 text-primary font-mono text-center rounded-none focus-visible:ring-primary/50"
            />
            <button onClick={handleSave} className="p-2 text-primary hover:text-primary/70 transition-colors">
              <Check className="w-5 h-5" />
            </button>
            <button onClick={handleCancel} className="p-2 text-primary/40 hover:text-primary/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl text-primary font-bold tracking-widest uppercase">
              {displayName}
            </h1>
            <button
              onClick={() => { setDraft(displayName); setEditing(true); }}
              className="text-primary/40 hover:text-primary transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {saved && (
          <span className="text-xs font-mono text-primary/70 uppercase tracking-widest">{t.profileSaved}</span>
        )}

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-primary shadow-[0_0_6px_rgba(0,255,100,0.9)] animate-pulse" />
          <span className="font-mono text-xs text-primary/70 uppercase tracking-widest">{t.profileOnlineVal}</span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard
          icon={<Radio className="w-4 h-4" />}
          label={t.profilePhone}
          value={session.phone}
        />
        <InfoCard
          icon={<Lock className="w-4 h-4" />}
          label={t.profileSession}
          value={sessionShort + "..."}
        />
        <InfoCard
          icon={<Shield className="w-4 h-4" />}
          label={t.profileProtocol}
          value={t.profileProtocolVal}
        />
        <InfoCard
          icon={<Zap className="w-4 h-4" />}
          label={t.profileOnline}
          value={t.profileOnlineVal}
        />
      </div>

      {/* Terminal-style activity block */}
      <div className="border border-primary/20 bg-black/40 p-4 font-mono text-xs text-primary/60 space-y-1">
        <div className="text-primary/30 mb-3 uppercase tracking-widest">// terminal output</div>
        <div><span className="text-primary/40">[sys]</span> Encryption layer: <span className="text-primary">active</span></div>
        <div><span className="text-primary/40">[sys]</span> Session integrity: <span className="text-primary">verified</span></div>
        <div><span className="text-primary/40">[sys]</span> Identity node: <span className="text-primary">{session.userId}</span></div>
        <div><span className="text-primary/40">[sys]</span> Stealth mode: <span className="text-primary/50">standby</span></div>
      </div>

      {/* Logout */}
      <Button
        onClick={logout}
        className="w-full bg-destructive/10 text-destructive border border-destructive/50 hover:bg-destructive hover:text-destructive-foreground rounded-none font-mono uppercase tracking-widest shadow-none"
      >
        {t.profileLogout}
      </Button>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-primary/20 bg-black/30 p-4 flex items-start gap-3">
      <div className="text-primary/50 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-mono text-xs text-primary/40 uppercase tracking-widest">{label}</p>
        <p className="font-mono text-sm text-primary font-bold truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
