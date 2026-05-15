import { useState, useEffect, useRef, useCallback } from "react";
import {
  useListUsers,
  useFetchMessages,
  useSendMessage,
  getListUsersQueryKey,
  getFetchMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../lib/session";
import { useLang } from "../lib/lang";
import {
  Clock,
  LockKeyhole,
  Send,
  Search,
  Shield,
  ArrowLeft,
  X,
  Phone,
  Radio,
  Wifi,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MobileView = "list" | "chat";

const NEON_COLORS: Record<string, string> = {
  "#00ff64": "green",
  "#00c2ff": "cyan",
  "#ff00c8": "magenta",
  "#ff6600": "orange",
  "#ff3355": "red",
  "#a855f7": "purple",
  "#ffd700": "gold",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({
  name,
  avatar,
  size = "md",
}: {
  name: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-16 h-16 text-2xl" : "w-10 h-10 text-sm";
  const bg = avatar ?? "#00ff64";
  return (
    <div
      className={`${dim} flex items-center justify-center font-mono font-bold border border-black/40 flex-shrink-0`}
      style={{ backgroundColor: bg + "22", borderColor: bg + "66", color: bg }}
    >
      {getInitials(name)}
    </div>
  );
}

function useUnreadCounts(sessionId: string | null) {
  const [unread, setUnread] = useState<Record<number, number>>({});
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchUnread = useCallback(async () => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${BASE}/api/messages/unread`, {
        headers: { "x-session-id": sessionId },
      });
      if (r.ok) setUnread(await r.json());
    } catch {
      // ignore
    }
  }, [sessionId, BASE]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 4000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  return { unread, clearUnread: (uid: number) => setUnread((p) => ({ ...p, [uid]: 0 })) };
}

type UserProfile = {
  id: number;
  name: string;
  phone: string;
  avatar?: string | null;
  isOnline: boolean;
  lastSeen?: string | null;
};

function ProfileModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full md:max-w-sm bg-black border border-primary/40 shadow-[0_0_40px_rgba(0,255,100,0.15)] p-6 space-y-5 animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-primary/40 uppercase tracking-widest">// Профиль узла</span>
          <button onClick={onClose} className="text-primary/40 hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar name={user.name} avatar={user.avatar} size="lg" />
          <div className="text-center">
            <h2 className="font-mono text-xl text-primary font-bold tracking-widest uppercase">{user.name}</h2>
            {user.isOnline ? (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_4px_#00ff64]" />
                <span className="font-mono text-xs text-primary/60">в сети</span>
              </div>
            ) : (
              <span className="font-mono text-xs text-primary/30">не в сети</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <InfoRow icon={<Radio className="w-3.5 h-3.5" />} label="Телефон" value={user.phone} />
          <InfoRow icon={<Wifi className="w-3.5 h-3.5" />} label="ID узла" value={`#${user.id}`} />
        </div>

        {/* Terminal block */}
        <div className="border border-primary/15 bg-black/60 p-3 font-mono text-xs text-primary/40 space-y-0.5">
          <div><span className="text-primary/25">[sys]</span> Node: <span className="text-primary/70">{user.name.toUpperCase()}</span></div>
          <div><span className="text-primary/25">[sys]</span> Status: <span className={user.isOnline ? "text-primary" : "text-primary/30"}>{user.isOnline ? "ONLINE" : "OFFLINE"}</span></div>
          <div><span className="text-primary/25">[sys]</span> Protocol: <span className="text-primary/70">E2E-SHIFR</span></div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border border-primary/15 bg-black/30 px-3 py-2">
      <span className="text-primary/40">{icon}</span>
      <span className="font-mono text-xs text-primary/40 uppercase w-16 flex-shrink-0">{label}</span>
      <span className="font-mono text-sm text-primary font-bold truncate">{value}</span>
    </div>
  );
}

function MessageStatusIcon({ isPending, readAt }: { isPending?: boolean; readAt?: string | null }) {
  if (isPending) {
    return (
      <span title="Отправка...">
        <Clock className="w-3 h-3 text-primary/50 animate-pulse inline-block" />
      </span>
    );
  }
  if (readAt) {
    return (
      <span title="Прочитано">
        <LockKeyhole className="w-3 h-3 text-white inline-block drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]" />
      </span>
    );
  }
  return (
    <span title="Доставлено">
      <LockKeyhole className="w-3 h-3 text-primary/35 inline-block" />
    </span>
  );
}

export default function Chat() {
  const { session } = useSession();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sendingText, setSendingText] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { unread, clearUnread } = useUnreadCounts(session?.sessionId ?? null);

  const { data: users = [] } = useListUsers({
    query: { queryKey: getListUsersQueryKey(), refetchInterval: 5000 },
  });

  const { data: messages = [] } = useFetchMessages(selectedUserId!, {
    query: {
      enabled: !!selectedUserId,
      queryKey: getFetchMessagesQueryKey(selectedUserId!),
      refetchInterval: 2000,
    },
  });

  const sendMessage = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendingText]);

  useEffect(() => {
    if (mobileView === "chat") setTimeout(() => inputRef.current?.focus(), 100);
  }, [mobileView]);

  const handleSelectContact = (userId: number) => {
    setSelectedUserId(userId);
    setMobileView("chat");
    setText("");
    clearUnread(userId);
  };

  const handleBackToList = () => {
    setMobileView("list");
    setSelectedUserId(null);
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
          queryClient.invalidateQueries({ queryKey: getFetchMessagesQueryKey(selectedUserId!) });
        },
        onError: () => setSendingText(null),
      }
    );
  };

  const handleOpenProfile = async (userId: number) => {
    try {
      const r = await fetch(`${BASE}/api/users/${userId}`, {
        headers: { "x-session-id": session?.sessionId ?? "" },
      });
      if (r.ok) setProfileUser(await r.json());
    } catch {}
  };

  // Sort: users with unread first, then rest
  const sortedUsers = [...users].sort((a, b) => {
    const ua = unread[a.id] ?? 0;
    const ub = unread[b.id] ?? 0;
    if (ub !== ua) return ub - ua;
    return 0;
  });

  const filteredUsers = sortedUsers.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  );
  const activeUser = users.find((u) => u.id === selectedUserId);

  // ── Contact List ────────────────────────────────────────────────────────
  const ContactList = (
    <div
      className={[
        "flex flex-col bg-black/60 border-r border-border/60 relative z-10",
        mobileView === "chat" ? "hidden md:flex md:w-72" : "flex w-full",
        "md:w-72 md:flex-shrink-0",
      ].filter(Boolean).join(" ")}
    >
      {/* Search */}
      <div className="p-3 border-b border-border/40 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 bg-black/60 border-primary/15 text-primary rounded-none focus-visible:ring-primary/30 font-mono text-sm h-9"
          />
        </div>
      </div>

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-primary/25 uppercase tracking-widest">{t.noNodes}</div>
        ) : (
          filteredUsers.map((user) => {
            const hasUnread = (unread[user.id] ?? 0) > 0;
            const isSelected = selectedUserId === user.id && mobileView !== "list";
            return (
              <button
                key={user.id}
                onClick={() => handleSelectContact(user.id)}
                className={[
                  "w-full px-3 py-3 flex items-center gap-3 border-b border-border/20 transition-all text-left border-l-2",
                  isSelected
                    ? "bg-primary/8 border-l-primary shadow-[inset_2px_0_8px_rgba(0,255,100,0.08)]"
                    : "hover:bg-primary/4 border-l-transparent",
                ].join(" ")}
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={user.name} avatar={user.avatar} size="md" />
                  {user.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border border-black shadow-[0_0_5px_#00ff64]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-primary font-bold truncate">{user.name}</p>
                  <p className="text-[11px] text-primary/35 font-mono truncate">{user.phone}</p>
                </div>
                {hasUnread && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse flex-shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // ── Chat Panel ──────────────────────────────────────────────────────────
  const ChatPanel = (
    <div
      className={[
        "flex flex-col flex-1 relative z-10 bg-[#020a04]/80 min-w-0",
        mobileView === "list" ? "hidden md:flex" : "flex",
      ].join(" ")}
    >
      {selectedUserId && activeUser ? (
        <>
          {/* Header */}
          <div className="h-14 border-b border-primary/15 flex items-center px-3 gap-3 flex-shrink-0 bg-black/70">
            <button
              onClick={handleBackToList}
              className="md:hidden p-1.5 text-primary/60 hover:text-primary transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Clickable avatar/name → show profile */}
            <button
              onClick={() => handleOpenProfile(activeUser.id)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
            >
              <div className="relative">
                <Avatar name={activeUser.name} avatar={activeUser.avatar} size="sm" />
                {activeUser.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-black shadow-[0_0_4px_#00ff64]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-mono text-sm text-primary font-bold truncate group-hover:underline underline-offset-2 decoration-primary/40">
                  {activeUser.name}
                </h2>
                <p className="text-[10px] text-primary/35 font-mono">
                  {activeUser.isOnline ? "● в сети" : "● не в сети"}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1 px-2 py-1 bg-primary/8 border border-primary/20 text-[9px] text-primary/60 font-mono flex-shrink-0">
              <LockKeyhole className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">E2E</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2">
            {messages.length === 0 && !sendingText ? (
              <div className="h-full flex items-center justify-center text-primary/20 font-mono text-xs text-center px-4">
                {t.noMessages}
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isMe = msg.fromUserId === session?.userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-150`}
                    >
                      {!isMe && (
                        <div className="mr-2 flex-shrink-0 self-end mb-1">
                          <Avatar name={activeUser.name} avatar={activeUser.avatar} size="sm" />
                        </div>
                      )}
                      <div className="max-w-[78%] sm:max-w-[65%] group">
                        <div
                          className={`px-3.5 py-2.5 font-mono text-sm leading-relaxed ${
                            isMe
                              ? "bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/40 text-primary rounded-tl-lg rounded-tr-sm rounded-bl-lg shadow-[0_0_12px_rgba(0,255,100,0.06)]"
                              : "bg-gradient-to-br from-white/5 to-white/2 border border-white/10 text-white/85 rounded-tr-lg rounded-tl-sm rounded-br-lg"
                          }`}
                        >
                          <div className="break-words whitespace-pre-wrap">{msg.text}</div>
                          <div className={`flex items-center gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-end"}`}>
                            <span className="text-[10px] opacity-35">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isMe && <MessageStatusIcon readAt={msg.readAt} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pending (optimistic) message */}
                {sendingText && (
                  <div className="flex justify-end animate-in fade-in">
                    <div className="max-w-[78%] sm:max-w-[65%]">
                      <div className="px-3.5 py-2.5 font-mono text-sm leading-relaxed bg-gradient-to-br from-primary/10 to-primary/3 border border-primary/25 text-primary/70 rounded-tl-lg rounded-tr-sm rounded-bl-lg opacity-75">
                        <div className="break-words whitespace-pre-wrap">{sendingText}</div>
                        <div className="flex items-center gap-1 mt-1.5 justify-end">
                          <span className="text-[10px] opacity-35">
                            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <MessageStatusIcon isPending />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-black/90 border-t border-primary/10 flex-shrink-0">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(e); }}
                placeholder={t.messagePlaceholder}
                className="flex-1 bg-black/70 border-primary/20 text-primary placeholder:text-primary/25 font-mono rounded-none focus-visible:ring-primary/30 text-sm h-10"
              />
              <Button
                type="submit"
                disabled={!text.trim() || sendMessage.isPending}
                className="bg-primary/15 text-primary border border-primary/40 hover:bg-primary hover:text-black rounded-none font-mono px-4 flex-shrink-0 h-10 transition-all"
              >
                <Send className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{t.sendBtn}</span>
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="hidden md:flex h-full items-center justify-center">
          <div className="text-center font-mono space-y-4">
            <Shield className="w-16 h-16 text-primary/15 mx-auto" />
            <p className="text-primary/30 uppercase tracking-widest text-sm">{t.selectNode}</p>
            <p className="text-primary/15 text-xs font-mono">// ожидание выбора узла</p>
          </div>
        </div>
      )}

      {/* Profile modal overlay */}
      {profileUser && (
        <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
      )}
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {ContactList}
      {ChatPanel}
      {/* Phone icon for mobile hint */}
      {mobileView === "list" && users.length > 0 && (
        <div className="md:hidden fixed bottom-20 right-4 z-20">
          <Phone className="w-5 h-5 text-primary/20" />
        </div>
      )}
    </div>
  );
}
