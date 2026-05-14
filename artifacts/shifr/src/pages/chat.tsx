import { useState, useEffect, useRef } from "react";
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
import { Lock, Send, Search, Shield, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MobileView = "list" | "chat";

export default function Chat() {
  const { session } = useSession();
  const { t } = useLang();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Poll contacts every 5s so new users appear automatically
  const { data: users = [] } = useListUsers({
    query: {
      queryKey: getListUsersQueryKey(),
      refetchInterval: 5000,
    },
  });

  // Poll messages every 2s for real-time feel
  const { data: messages = [] } = useFetchMessages(selectedUserId!, {
    query: {
      enabled: !!selectedUserId,
      queryKey: getFetchMessagesQueryKey(selectedUserId!),
      refetchInterval: 2000,
    },
  });

  const sendMessage = useSendMessage();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens on mobile
  useEffect(() => {
    if (mobileView === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mobileView]);

  const handleSelectContact = (userId: number) => {
    setSelectedUserId(userId);
    setMobileView("chat");
    setText("");
  };

  const handleBackToList = () => {
    setMobileView("list");
    setSelectedUserId(null);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedUserId) return;

    sendMessage.mutate(
      { data: { text: text.trim(), toUserId: selectedUserId } },
      {
        onSuccess: () => {
          setText("");
          queryClient.invalidateQueries({
            queryKey: getFetchMessagesQueryKey(selectedUserId),
          });
        },
      }
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search)
  );
  const activeUser = users.find((u) => u.id === selectedUserId);

  // ── Contact list panel ──────────────────────────────────────────────────
  const ContactList = (
    <div
      className={[
        "flex flex-col bg-black/40 border-r border-border relative z-10",
        // Mobile: full width when on list view, hidden when on chat view
        mobileView === "chat" ? "hidden md:flex md:w-80" : "flex w-full",
        // Desktop: always fixed width sidebar
        "md:w-80 md:flex-shrink-0",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Search */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
          <Input
            data-testid="input-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 bg-black/50 border-primary/20 text-primary rounded-none focus-visible:ring-primary/50 font-mono text-sm"
          />
        </div>
      </div>

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-primary/30 uppercase tracking-widest">
            {t.noNodes}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <button
              key={user.id}
              data-testid={`contact-user-${user.id}`}
              onClick={() => handleSelectContact(user.id)}
              className={[
                "w-full p-4 flex items-center gap-3 border-b border-border/40 transition-colors text-left border-l-2",
                selectedUserId === user.id && mobileView !== "list"
                  ? "bg-primary/10 border-l-primary"
                  : "hover:bg-primary/5 border-l-transparent",
              ].join(" ")}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-black border border-primary/30 flex items-center justify-center font-mono font-bold text-primary text-sm">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                {user.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full animate-pulse border border-black shadow-[0_0_5px_#00ff64]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-primary font-bold truncate">
                  {user.name}
                </p>
                <p className="text-xs text-primary/40 font-mono truncate">{user.phone}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  // ── Chat panel ──────────────────────────────────────────────────────────
  const ChatPanel = (
    <div
      className={[
        "flex flex-col flex-1 relative z-10 bg-black/20 min-w-0",
        // Mobile: full width when chat view, hidden when list view
        mobileView === "list" ? "hidden md:flex" : "flex",
      ].join(" ")}
    >
      {selectedUserId && activeUser ? (
        <>
          {/* Header */}
          <div className="h-14 md:h-16 border-b border-border flex items-center px-3 md:px-6 bg-black/60 gap-3 flex-shrink-0">
            {/* Back button — mobile only */}
            <button
              onClick={handleBackToList}
              className="md:hidden p-1.5 text-primary/70 hover:text-primary transition-colors flex-shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 flex-shrink-0 bg-primary/10 border border-primary/30 flex items-center justify-center font-mono font-bold text-primary text-xs">
              {activeUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-mono text-base text-primary font-bold truncate">
                {activeUser.name}
              </h2>
              {activeUser.isOnline && (
                <p className="text-xs text-primary/50 font-mono">{t.profileOnlineVal}</p>
              )}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 text-[9px] text-primary font-mono flex-shrink-0">
              <Lock className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">{t.e2e}</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-primary/25 font-mono text-xs text-center px-4">
                {t.noMessages}
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.fromUserId === session?.userId;
                return (
                  <div
                    key={msg.id}
                    data-testid={`message-${msg.id}`}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1`}
                  >
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 font-mono text-sm border ${
                        isMe
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-black border-primary/30 text-primary/90"
                      }`}
                    >
                      <div>{msg.text}</div>
                      <div className="text-[10px] opacity-40 mt-1.5 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="p-3 md:p-4 bg-black/80 border-t border-border flex-shrink-0">
            <form onSubmit={handleSend} className="flex gap-2 md:gap-3">
              <Input
                ref={inputRef}
                data-testid="input-message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.messagePlaceholder}
                className="flex-1 bg-black border-primary/30 text-primary placeholder:text-primary/30 font-mono rounded-none focus-visible:ring-primary/50 text-sm"
              />
              <Button
                data-testid="button-send"
                type="submit"
                disabled={!text.trim() || sendMessage.isPending}
                className="bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-black rounded-none font-mono px-4 md:px-8 flex-shrink-0"
              >
                <Send className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{t.sendBtn}</span>
              </Button>
            </form>
          </div>
        </>
      ) : (
        // Desktop only placeholder (hidden on mobile via CSS)
        <div className="hidden md:flex h-full items-center justify-center">
          <div className="text-center font-mono space-y-4">
            <Shield className="w-16 h-16 text-primary/20 mx-auto" />
            <p className="text-primary/40 uppercase tracking-widest text-sm">{t.selectNode}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      {ContactList}
      {ChatPanel}
    </div>
  );
}
