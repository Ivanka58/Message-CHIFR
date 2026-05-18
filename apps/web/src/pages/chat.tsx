import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  useListUsers,
  useFetchMessages,
  useSendMessage,
} from "@shifr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../lib/session";
import { useLang } from "../lib/lang";
import {
  Clock, LockKeyhole, Send, Search, Shield, ArrowLeft,
  X, Radio, Wifi, Copy, Pencil, Trash2, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── Types ────────────────────────────────────────────────────────────────────

type ServerMsg = {
  id: number; fromUserId: number; toUserId: number;
  text: string; timestamp: string; readAt: string | null;
  editedAt: string | null; fromName: string | null; isEncrypted: boolean;
};

type CtxMenu = { x: number; y: number; msgId: number; isMe: boolean; text: string };
type DeleteModal =
  | { step: "scope"; msgId: number }
  | { step: "confirm"; msgId: number; scope: "self" | "all" };
type EditState = { id: number; text: string };
type ProfileUser = { id: number; name: string; phone: string; avatar?: string | null; isOnline: boolean };

// ── Avatar ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, avatar, size = "md" }: { name: string; avatar?: string | null; size?: "xs" | "sm" | "md" | "lg" }) {
  const dim = size === "xs" ? "w-7 h-7 text-[10px]" : size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-16 h-16 text-2xl" : "w-11 h-11 text-sm";
  const color = avatar ?? "#00ff64";
  return (
    <div
      className={`${dim} flex items-center justify-center font-mono font-bold flex-shrink-0 select-none`}
      style={{ backgroundColor: color + "22", border: `1px solid ${color}55`, color }}
    >
      {getInitials(name)}
    </div>
  );
}

// ── Code Particles ───────────────────────────────────────────────────────────

function CodeParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      char: Math.random() > 0.45 ? "1" : Math.random() > 0.5 ? "0" : ["<", ">", "/", "#", "$"][Math.floor(Math.random() * 5)],
      dx: Math.round((Math.random() - 0.5) * 160),
      dy: Math.round(-(Math.random() * 90 + 20)),
      delay: Math.round(Math.random() * 250),
      size: Math.random() > 0.65 ? 13 : 10,
    })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute font-mono text-primary particle-fly"
          style={{
            left: "50%", top: "50%",
            fontSize: p.size,
            animationDelay: `${p.delay}ms`,
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
          } as React.CSSProperties}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}

// ── Message Status Icon ──────────────────────────────────────────────────────

function MsgStatus({ isPending, readAt }: { isPending?: boolean; readAt?: string | null }) {
  if (isPending) return <Clock className="w-3 h-3 opacity-40 animate-pulse inline-block" />;
  if (readAt) return <LockKeyhole className="w-3 h-3 inline-block drop-shadow-[0_0_4px_rgba(255,255,255,0.9)] text-white" />;
  return <LockKeyhole className="w-3 h-3 opacity-30 inline-block" />;
}

// ── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({ ctx, isMe, onCopy, onEdit, onDelete, onClose }: {
  ctx: CtxMenu; isMe: boolean;
  onCopy(): void; onEdit(): void; onDelete(): void; onClose(): void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Constrain to viewport
  const [pos, setPos] = useState({ x: ctx.x, y: ctx.y });
  useEffect(() => {
    if (!menuRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = menuRef.current;
    const vw = window.innerWidth, vh = window.innerHeight;
    setPos({
      x: Math.min(ctx.x, vw - w - 8),
      y: Math.min(ctx.y, vh - h - 8),
    });
  }, [ctx.x, ctx.y]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="ctx-menu-in fixed z-[200] min-w-[160px] py-1 font-mono text-sm"
      style={{
        left: pos.x, top: pos.y,
        background: "rgba(4,14,6,0.97)",
        border: "1px solid rgba(0,255,100,0.35)",
        boxShadow: "0 0 20px rgba(0,255,100,0.15), 0 8px 32px rgba(0,0,0,0.8)",
      }}
    >
      <CtxItem icon={<Copy className="w-3.5 h-3.5" />} label="Скопировать" onClick={onCopy} />
      {isMe && <CtxItem icon={<Pencil className="w-3.5 h-3.5" />} label="Изменить" onClick={onEdit} />}
      <div className="my-1 border-t border-primary/15" />
      <CtxItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Удалить" onClick={onDelete} danger />
    </div>
  );
}

function CtxItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick(): void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all text-left ${
        danger ? "text-red-400 hover:bg-red-500/15" : "text-primary/80 hover:bg-primary/10 hover:text-primary"
      }`}
    >
      {icon}
      <span className="text-[13px]">{label}</span>
    </button>
  );
}

// ── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModalUI({ modal, onClose, onConfirm }: {
  modal: DeleteModal;
  onClose(): void;
  onConfirm(scope: "self" | "all"): void;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-[90vw] max-w-sm p-6 font-mono space-y-5 animate-in zoom-in-95"
        style={{
          background: "rgba(4,14,6,0.98)",
          border: "1px solid rgba(239,68,68,0.4)",
          boxShadow: "0 0 30px rgba(239,68,68,0.1), 0 16px 48px rgba(0,0,0,0.9)",
        }}
      >
        {modal.step === "scope" ? (
          <>
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-4 h-4" />
              <span className="text-sm uppercase tracking-widest">Удаление сообщения</span>
            </div>
            <p className="text-primary/50 text-xs leading-relaxed">Выберите тип удаления:</p>
            <div className="space-y-2">
              <RedBtn label="Удалить у себя" sub="Останется у собеседника" onClick={() => onConfirm("self")} />
              <RedBtn label="Удалить у всех" sub="Исчезнет у обоих навсегда" onClick={() => onConfirm("all")} />
            </div>
            <button onClick={onClose} className="w-full py-2 text-primary/40 hover:text-primary/70 text-xs uppercase tracking-widest transition-colors border border-primary/15 hover:border-primary/30">
              Отмена
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm uppercase tracking-widest">Подтверждение</span>
            </div>
            <p className="text-primary/70 text-sm leading-relaxed">
              {modal.scope === "self"
                ? "Сообщение будет удалено у вас. У собеседника оно останется."
                : "Сообщение удалится и у вас, и у собеседника. Восстановить его будет невозможно."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (modal.step === "confirm") onConfirm(modal.scope);
                }}
                className="flex-1 py-2.5 text-xs uppercase tracking-widest transition-all font-bold text-red-400 border border-red-500/50 hover:bg-red-500/15"
              >
                Подтвердить
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-xs uppercase tracking-widest transition-all text-primary/40 border border-primary/15 hover:border-primary/30 hover:text-primary/60"
              >
                Отмена
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RedBtn({ label, sub, onClick }: { label: string; sub: string; onClick(): void }) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-all group"
    >
      <div className="text-red-400 text-sm font-bold">{label}</div>
      <div className="text-primary/30 text-[11px] mt-0.5 group-hover:text-primary/50">{sub}</div>
    </button>
  );
}

// ── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({ user, onClose }: { user: ProfileUser; onClose(): void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div
        className="w-full md:max-w-sm p-6 space-y-5 animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0"
        style={{ background: "rgba(4,14,6,0.98)", border: "1px solid rgba(0,255,100,0.3)", boxShadow: "0 0 40px rgba(0,255,100,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-primary/35 uppercase tracking-widest">// профиль узла</span>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar name={user.name} avatar={user.avatar} size="lg" />
          <div className="text-center">
            <h2 className="font-mono text-xl text-primary font-bold tracking-widest uppercase">{user.name}</h2>
            {user.isOnline ? (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_4px_#00ff64]" />
                <span className="font-mono text-xs text-primary/50">в сети</span>
              </div>
            ) : <span className="font-mono text-xs text-primary/25">не в сети</span>}
          </div>
        </div>
        <div className="space-y-2">
          {[
            { icon: <Radio className="w-3.5 h-3.5" />, label: "Телефон", value: user.phone },
            { icon: <Wifi className="w-3.5 h-3.5" />, label: "ID узла", value: `#${user.id}` },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 border border-primary/15 bg-black/40 px-3 py-2">
              <span className="text-primary/35">{row.icon}</span>
              <span className="font-mono text-xs text-primary/35 uppercase w-16 flex-shrink-0">{row.label}</span>
              <span className="font-mono text-sm text-primary font-bold truncate">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Unread hook ──────────────────────────────────────────────────────────────

function useUnreadCounts(sessionId: string | null) {
  const [unread, setUnread] = useState<Record<number, number>>({});
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const fetch_ = useCallback(async () => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${BASE}/api/messages/unread`, { headers: { "x-session-id": sessionId } });
      if (r.ok) setUnread(await r.json());
    } catch { }
  }, [sessionId, BASE]);
  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 4000);
    return () => clearInterval(id);
  }, [fetch_]);
  return { unread, clearUnread: (uid: number) => setUnread((p) => ({ ...p, [uid]: 0 })) };
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Chat() {
  const { session } = useSession();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sendingText, setSendingText] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModal | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [dissolvingIds, setDissolvingIds] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const { unread, clearUnread } = useUnreadCounts(session?.sessionId ?? null);

  const { data: users = [] } = useListUsers({ query: { refetchInterval: 5000 } });
  const { data: rawMessages = [] } = useFetchMessages(selectedUserId!, {
    query: { enabled: !!selectedUserId, refetchInterval: 2000 },
  });
  const messages = rawMessages as unknown as ServerMsg[];
  const sendMessage = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sendingText]);

  useEffect(() => {
    if (mobileView === "chat") setTimeout(() => inputRef.current?.focus(), 100);
  }, [mobileView]);

  useEffect(() => {
    if (editState) setTimeout(() => editInputRef.current?.focus(), 50);
  }, [editState?.id]);

  // Dissolve animation then callback
  const triggerDissolve = useCallback((msgId: number, callback: () => void) => {
    setDissolvingIds((p) => new Set([...p, msgId]));
    setTimeout(() => {
      callback();
      setDissolvingIds((p) => { const n = new Set(p); n.delete(msgId); return n; });
    }, 700);
  }, []);

  // Delete handlers
  const handleDeleteStep1 = useCallback((msgId: number) => {
    setCtxMenu(null);
    setDeleteModal({ step: "scope", msgId });
  }, []);

  const handleDeleteStep2 = useCallback((scope: "self" | "all") => {
    setDeleteModal((prev) => prev ? { step: "confirm", msgId: prev.msgId, scope } : null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteModal || deleteModal.step !== "confirm") return;
    const { msgId, scope } = deleteModal;
    setDeleteModal(null);
    triggerDissolve(msgId, async () => {
      await fetch(`${BASE}/api/messages/${msgId}?scope=${scope}`, {
        method: "DELETE",
        headers: { "x-session-id": session?.sessionId ?? "" },
      });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedUserId!}`] });
    });
  }, [deleteModal, triggerDissolve, BASE, session, queryClient, selectedUserId]);

  // Edit handlers
  const handleEditOpen = useCallback((msg: ServerMsg) => {
    setCtxMenu(null);
    setEditState({ id: msg.id, text: msg.text });
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editState || !editState.text.trim()) return;
    const { id, text: newText } = editState;
    setEditState(null);
    await fetch(`${BASE}/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-session-id": session?.sessionId ?? "" },
      body: JSON.stringify({ text: newText.trim() }),
    });
    queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedUserId!}`] });
  }, [editState, BASE, session, queryClient, selectedUserId]);

  // Context menu
  const handleMsgClick = useCallback((e: React.MouseEvent, msg: ServerMsg) => {
    e.stopPropagation();
    const isMe = msg.fromUserId === session?.userId;
    setCtxMenu({ x: e.clientX, y: e.clientY, msgId: msg.id, isMe, text: msg.text });
  }, [session]);

  const handleSelectContact = (userId: number) => {
    setSelectedUserId(userId);
    setMobileView("chat");
    setText("");
    clearUnread(userId);
    setCtxMenu(null);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedUserId || sendMessage.isPending) return;
    const msgText = text.trim();
    setText("");
    setSendingText(msgText);
    sendMessage.mutate(
      { data: { text: msgText, toUserId: selectedUserId } },
      {
        onSuccess: () => {
          setSendingText(null);
          queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedUserId!}`] });
        },
        onError: () => setSendingText(null),
      }
    );
  };

  const handleOpenProfile = async (userId: number) => {
    try {
      const r = await fetch(`${BASE}/api/users/${userId}`, { headers: { "x-session-id": session?.sessionId ?? "" } });
      if (r.ok) setProfileUser(await r.json());
    } catch { }
  };

  const sortedUsers = [...users].sort((a, b) => (unread[b.id] ?? 0) - (unread[a.id] ?? 0));
  const filteredUsers = sortedUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  );
  const activeUser = users.find((u) => u.id === selectedUserId);

  // ── Contact List ──────────────────────────────────────────────────────────
  const ContactList = (
    <div
      className={[
        "flex flex-col border-r relative z-10",
        mobileView === "chat" ? "hidden md:flex md:w-[280px]" : "flex w-full",
        "md:w-[280px] md:flex-shrink-0",
      ].filter(Boolean).join(" ")}
      style={{ background: "rgba(2,8,3,0.95)", borderColor: "rgba(0,255,100,0.15)" }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b" style={{ borderColor: "rgba(0,255,100,0.12)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] text-primary/40 uppercase tracking-[3px]">// узлы сети</span>
          <span className="font-mono text-[10px] text-primary/25">{filteredUsers.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/35" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-8 h-8 text-xs bg-black/60 border-primary/15 text-primary font-mono rounded-none focus-visible:ring-primary/25 placeholder:text-primary/25"
          />
        </div>
      </div>

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-primary/20 uppercase tracking-widest">{t.noNodes}</div>
        ) : filteredUsers.map((user) => {
          const hasUnread = (unread[user.id] ?? 0) > 0;
          const isSelected = selectedUserId === user.id && mobileView !== "list";
          return (
            <button
              key={user.id}
              onClick={() => handleSelectContact(user.id)}
              className={`w-full px-3 py-3.5 flex items-center gap-3 text-left transition-all relative border-l-2 ${
                isSelected ? "border-l-primary" : "border-l-transparent hover:border-l-primary/30"
              }`}
              style={{
                borderBottomColor: "rgba(0,255,100,0.08)",
                borderBottomWidth: 1,
                background: isSelected ? "rgba(0,255,100,0.06)" : undefined,
              }}
            >
              {/* Glow when selected */}
              {isSelected && (
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(0,255,100,0.05) 0%, transparent 60%)" }} />
              )}
              <div className="relative flex-shrink-0">
                <Avatar name={user.name} avatar={user.avatar} size="md" />
                {user.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-black shadow-[0_0_6px_#00ff64]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold text-primary truncate">{user.name}</p>
                <p className="font-mono text-[11px] text-primary/30 truncate mt-0.5">{user.phone}</p>
              </div>
              {hasUnread && (
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono flex-shrink-0 animate-pulse"
                  style={{ background: "#ef4444", boxShadow: "0 0 10px rgba(239,68,68,0.8)", color: "white" }}
                >
                  {unread[user.id] > 9 ? "9+" : unread[user.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Chat Panel ────────────────────────────────────────────────────────────
  const ChatPanel = (
    <div
      className={["flex flex-col flex-1 relative z-10 min-w-0", mobileView === "list" ? "hidden md:flex" : "flex"].join(" ")}
      onClick={() => setCtxMenu(null)}
    >
      {selectedUserId && activeUser ? (
        <>
          {/* Header */}
          <div
            className="h-[60px] flex items-center px-3 gap-3 flex-shrink-0 relative"
            style={{ background: "rgba(2,10,4,0.95)", borderBottom: "1px solid rgba(0,255,100,0.15)" }}
          >
            {/* Scanlines */}
            <div className="absolute inset-0 scanlines pointer-events-none" />
            <button onClick={() => { setMobileView("list"); setSelectedUserId(null); }} className="md:hidden p-1.5 text-primary/50 hover:text-primary transition-colors flex-shrink-0 relative z-10">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleOpenProfile(activeUser.id)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left group relative z-10"
            >
              <div className="relative">
                <Avatar name={activeUser.name} avatar={activeUser.avatar} size="sm" />
                {activeUser.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-black shadow-[0_0_5px_#00ff64]" />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-mono text-sm font-bold text-primary truncate group-hover:text-primary/80 transition-colors">{activeUser.name}</h2>
                <p className="font-mono text-[10px] leading-tight" style={{ color: activeUser.isOnline ? "#00ff64aa" : "#00ff6433" }}>
                  {activeUser.isOnline ? "● ONLINE" : "○ OFFLINE"}
                </p>
              </div>
            </button>
            {/* E2E badge */}
            <div className="relative z-10 flex items-center gap-1 px-2 py-1 font-mono text-[9px] text-primary/50 border border-primary/20 flex-shrink-0" style={{ background: "rgba(0,255,100,0.05)" }}>
              <LockKeyhole className="w-2.5 h-2.5" />
              <span className="hidden sm:inline tracking-widest">E2E</span>
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 chat-bg" onClick={() => setCtxMenu(null)}>
            {messages.length === 0 && !sendingText ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
                <div className="w-16 h-16 border border-primary/15 flex items-center justify-center" style={{ background: "rgba(0,255,100,0.03)" }}>
                  <Shield className="w-7 h-7 text-primary/20" />
                </div>
                <p className="font-mono text-xs text-primary/20">{t.noMessages}</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isMe = msg.fromUserId === session?.userId;
                  const isDissolving = dissolvingIds.has(msg.id);
                  const isEditing = editState?.id === msg.id;

                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                      {!isMe && (
                        <div className="mr-2 self-end mb-1 flex-shrink-0">
                          <Avatar name={activeUser.name} avatar={activeUser.avatar} size="xs" />
                        </div>
                      )}

                      <div className={`max-w-[76%] sm:max-w-[62%] relative ${isDissolving ? "msg-dissolving" : ""}`}>
                        {/* Code particles on dissolve */}
                        {isDissolving && <CodeParticles />}

                        {/* Edit mode */}
                        {isEditing ? (
                          <div className="p-2 border border-primary/50 bg-primary/5" style={{ minWidth: 160 }}>
                            <textarea
                              ref={editInputRef}
                              value={editState.text}
                              onChange={(e) => setEditState((p) => p ? { ...p, text: e.target.value } : null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                                if (e.key === "Escape") setEditState(null);
                              }}
                              className="w-full bg-transparent text-primary font-mono text-sm resize-none outline-none leading-relaxed min-h-[40px]"
                              rows={2}
                            />
                            <div className="flex gap-2 mt-1.5">
                              <button onClick={handleEditSave} className="text-primary text-xs font-mono border border-primary/40 px-2 py-0.5 hover:bg-primary/10 transition-colors">OK</button>
                              <button onClick={() => setEditState(null)} className="text-primary/40 text-xs font-mono border border-primary/15 px-2 py-0.5 hover:border-primary/30 transition-colors">Отмена</button>
                            </div>
                          </div>
                        ) : (
                          // Normal message bubble
                          <div
                            className="px-4 py-3 font-mono text-sm leading-relaxed cursor-pointer transition-all hover:brightness-110 active:scale-[0.99]"
                            onClick={(e) => handleMsgClick(e, msg)}
                            style={isMe ? {
                              background: "linear-gradient(135deg, rgba(0,255,100,0.20) 0%, rgba(0,255,100,0.06) 100%)",
                              border: "1px solid rgba(0,255,100,0.40)",
                              clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
                              boxShadow: "0 0 16px rgba(0,255,100,0.07), inset 0 1px 0 rgba(0,255,100,0.18)",
                              color: "#00ff64",
                            } : {
                              background: "linear-gradient(135deg, rgba(80,40,160,0.20) 0%, rgba(0,10,20,0.85) 100%)",
                              border: "1px solid rgba(255,255,255,0.10)",
                              clipPath: "polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.88)",
                            }}
                          >
                            <div className="break-words whitespace-pre-wrap">{msg.text}</div>
                            <div className="flex items-center gap-1.5 mt-2 justify-end">
                              {msg.editedAt && (
                                <span className="text-[9px] opacity-30 italic">ред.</span>
                              )}
                              <span className="text-[10px] opacity-30">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isMe && <MsgStatus readAt={msg.readAt} />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pending message */}
                {sendingText && (
                  <div className="flex justify-end animate-in fade-in">
                    <div className="max-w-[76%] sm:max-w-[62%]">
                      <div
                        className="px-4 py-3 font-mono text-sm leading-relaxed opacity-60"
                        style={{
                          background: "linear-gradient(135deg, rgba(0,255,100,0.12) 0%, rgba(0,255,100,0.04) 100%)",
                          border: "1px solid rgba(0,255,100,0.25)",
                          clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
                          color: "#00ff64",
                        }}
                      >
                        <div className="break-words">{sendingText}</div>
                        <div className="flex items-center gap-1.5 mt-2 justify-end">
                          <span className="text-[10px] opacity-30">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <MsgStatus isPending />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 p-3 md:p-4" style={{ background: "rgba(2,8,3,0.98)", borderTop: "1px solid rgba(0,255,100,0.12)" }}>
            <form onSubmit={handleSend} className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(e as unknown as React.FormEvent); }}
                  placeholder={t.messagePlaceholder}
                  className="flex-1 h-11 bg-black/70 border-primary/20 text-primary placeholder:text-primary/20 font-mono rounded-none focus-visible:ring-primary/25 text-sm pr-3"
                  style={{ clipPath: "polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)" }}
                />
              </div>
              <Button
                type="submit"
                disabled={!text.trim() || sendMessage.isPending}
                className="h-11 px-4 md:px-6 bg-primary/15 text-primary border border-primary/40 hover:bg-primary hover:text-black rounded-none font-mono font-bold transition-all flex-shrink-0 disabled:opacity-30"
                style={{ clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)" }}
              >
                <Send className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline text-xs tracking-widest">{t.sendBtn}</span>
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="hidden md:flex h-full items-center justify-center chat-bg">
          <div className="text-center font-mono space-y-5">
            <div className="w-20 h-20 border border-primary/15 flex items-center justify-center mx-auto" style={{ background: "rgba(0,255,100,0.03)" }}>
              <Shield className="w-9 h-9 text-primary/15" />
            </div>
            <div>
              <p className="text-primary/25 uppercase tracking-[4px] text-xs">{t.selectNode}</p>
              <p className="text-primary/12 text-[10px] mt-2 tracking-widest">// ожидание выбора узла</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {profileUser && <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />}
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {ContactList}
      {ChatPanel}

      {/* Context Menu */}
      {ctxMenu && (() => {
        const msg = messages.find((m) => m.id === ctxMenu.msgId);
        return (
          <ContextMenu
            ctx={ctxMenu}
            isMe={ctxMenu.isMe}
            onClose={() => setCtxMenu(null)}
            onCopy={() => { navigator.clipboard.writeText(ctxMenu.text).catch(() => {}); setCtxMenu(null); }}
            onEdit={() => { if (msg) handleEditOpen(msg); }}
            onDelete={() => handleDeleteStep1(ctxMenu.msgId)}
          />
        );
      })()}

      {/* Delete Modal */}
      {deleteModal && (
        <DeleteModalUI
          modal={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={deleteModal.step === "scope" ? handleDeleteStep2 : handleDeleteConfirm}
        />
      )}
    </div>
  );
}
