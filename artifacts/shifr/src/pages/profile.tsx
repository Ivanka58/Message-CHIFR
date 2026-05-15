import { useState, useEffect } from "react";
import { useSession } from "../lib/session";
import { useLang } from "../lib/lang";
import { Edit2, Check, X, Zap, Shield, Lock, Radio, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetMe } from "@workspace/api-client-react";

const AVATAR_COLORS = [
  "#00ff64",
  "#00c2ff",
  "#ff00c8",
  "#ff6600",
  "#ff3355",
  "#a855f7",
  "#ffd700",
  "#22d3ee",
];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function AvatarLarge({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="relative w-24 h-24 flex items-center justify-center border-2 shadow-lg transition-all duration-300"
      style={{
        backgroundColor: color + "22",
        borderColor: color + "88",
        boxShadow: `0 0 24px ${color}40`,
        color,
      }}
    >
      <span className="font-mono font-bold text-4xl select-none">{getInitials(name)}</span>
      <span
        className="absolute -bottom-1 -right-1 w-4 h-4"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
    </div>
  );
}

export default function Profile() {
  const { session, logout } = useSession();
  const { t } = useLang();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: me } = useGetMe();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(session?.name ?? "");
  const [draft, setDraft] = useState("");
  const [avatarColor, setAvatarColor] = useState("#00ff64");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load from server when profile data arrives
  useEffect(() => {
    if (me) {
      setDisplayName(me.name);
      if (me.avatar) setAvatarColor(me.avatar);
    }
  }, [me]);

  if (!session) return null;

  const handleSave = async () => {
    const trimmed = draft.trim() || displayName;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": session.sessionId,
        },
        body: JSON.stringify({ name: trimmed }),
      });
      if (r.ok) {
        setDisplayName(trimmed);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleColorSave = async (color: string) => {
    setAvatarColor(color);
    setShowColorPicker(false);
    await fetch(`${BASE}/api/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": session.sessionId,
      },
      body: JSON.stringify({ avatar: color }),
    });
  };

  const handleCancel = () => {
    setDraft(displayName);
    setEditing(false);
  };

  const sessionShort = session.sessionId?.slice(0, 8).toUpperCase() ?? "--------";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 relative z-10 h-full overflow-y-auto pb-12">
      {/* Header Card */}
      <div className="flex flex-col items-center gap-5 py-8 border border-primary/20 bg-black/50 px-6 relative">
        {/* Avatar with color picker */}
        <div className="relative">
          <AvatarLarge name={displayName} color={avatarColor} />
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            className="absolute -bottom-2 -right-2 w-7 h-7 bg-black border border-primary/40 flex items-center justify-center text-primary/60 hover:text-primary transition-colors"
            title="Сменить цвет аватара"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Color Picker */}
        {showColorPicker && (
          <div className="flex flex-wrap gap-2 justify-center p-3 border border-primary/20 bg-black/80 animate-in fade-in">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorSave(c)}
                className="w-8 h-8 border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: c + "33",
                  borderColor: c === avatarColor ? c : c + "44",
                  boxShadow: c === avatarColor ? `0 0 10px ${c}` : "none",
                }}
              />
            ))}
          </div>
        )}

        {/* Name editing */}
        {editing ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
              className="bg-black/50 border-primary/50 text-primary font-mono text-center rounded-none focus-visible:ring-primary/50"
              disabled={saving}
            />
            <button onClick={handleSave} disabled={saving} className="p-2 text-primary hover:text-primary/70 transition-colors">
              <Check className="w-5 h-5" />
            </button>
            <button onClick={handleCancel} className="p-2 text-primary/40 hover:text-primary/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl text-primary font-bold tracking-widest uppercase">{displayName}</h1>
            <button
              onClick={() => { setDraft(displayName); setEditing(true); }}
              className="text-primary/40 hover:text-primary transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {saved && (
          <span className="text-xs font-mono text-primary/70 uppercase tracking-widest animate-in fade-in">
            ✓ {t.profileSaved}
          </span>
        )}

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-primary shadow-[0_0_6px_rgba(0,255,100,0.9)] animate-pulse" />
          <span className="font-mono text-xs text-primary/70 uppercase tracking-widest">{t.profileOnlineVal}</span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoCard icon={<Radio className="w-4 h-4" />} label={t.profilePhone} value={session.phone} />
        <InfoCard icon={<Lock className="w-4 h-4" />} label={t.profileSession} value={sessionShort + "..."} />
        <InfoCard icon={<Shield className="w-4 h-4" />} label={t.profileProtocol} value={t.profileProtocolVal} />
        <InfoCard icon={<Zap className="w-4 h-4" />} label={t.profileOnline} value={t.profileOnlineVal} />
      </div>

      {/* Terminal block */}
      <div className="border border-primary/15 bg-black/40 p-4 font-mono text-xs text-primary/50 space-y-1">
        <div className="text-primary/25 mb-3 uppercase tracking-widest">// terminal output</div>
        <div><span className="text-primary/30">[sys]</span> Encryption layer: <span className="text-primary">active</span></div>
        <div><span className="text-primary/30">[sys]</span> Session integrity: <span className="text-primary">verified</span></div>
        <div><span className="text-primary/30">[sys]</span> Identity node: <span className="text-primary">{session.userId}</span></div>
        <div><span className="text-primary/30">[sys]</span> Avatar color: <span style={{ color: avatarColor }}>{avatarColor}</span></div>
      </div>

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
    <div className="border border-primary/15 bg-black/30 p-4 flex items-start gap-3">
      <div className="text-primary/40 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-mono text-xs text-primary/35 uppercase tracking-widest">{label}</p>
        <p className="font-mono text-sm text-primary font-bold truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
