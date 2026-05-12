import { useState, useEffect, useRef } from "react";
import { useListUsers, useFetchMessages, useSendMessage, getListUsersQueryKey, getFetchMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../lib/session";
import { Lock, Send, Search, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const { session } = useSession();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { data: messages = [] } = useFetchMessages(selectedUserId!, { 
    query: { 
      enabled: !!selectedUserId, 
      queryKey: getFetchMessagesQueryKey(selectedUserId!),
      refetchInterval: 3000
    } 
  });
  
  const sendMessage = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedUserId) return;

    sendMessage.mutate({ data: { text, toUserId: selectedUserId } }, {
      onSuccess: () => {
        setText("");
        queryClient.invalidateQueries({ queryKey: getFetchMessagesQueryKey(selectedUserId) });
      }
    });
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search));
  const activeUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="flex h-full w-full">
      {/* Sidebar Contacts */}
      <div className="w-80 border-r border-border bg-black/40 flex flex-col relative z-10">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Scan network..." 
              className="w-full pl-9 bg-black/50 border-primary/20 text-primary rounded-none focus-visible:ring-primary/50 font-mono text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map(user => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`w-full p-4 flex items-center gap-3 border-b border-border/50 transition-colors text-left ${selectedUserId === user.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-accent/20 border-l-2 border-l-transparent'}`}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-black border border-primary/30 flex items-center justify-center font-mono font-bold text-primary">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse border border-black shadow-[0_0_5px_#00ff64]" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="font-mono text-sm text-primary font-bold truncate">{user.name}</h3>
                <p className="text-xs text-primary/50 font-mono truncate">{user.phone}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 bg-black/20 backdrop-blur-sm">
        {selectedUserId && activeUser ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center px-6 bg-black/60">
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-lg text-primary font-bold">{activeUser.name}</h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/30 text-[10px] text-primary font-mono rounded-full">
                  <Lock className="w-3 h-3" /> E2E ENCRYPTED
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-primary/30 font-mono text-sm">
                  [ NO PREVIOUS SECURE COMMS DETECTED ]
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.fromUserId === session?.userId;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] font-mono text-primary">
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          {isMe && <Lock className="w-3 h-3" />}
                        </div>
                        <div className={`p-4 font-mono text-sm relative border ${isMe ? 'bg-primary/10 border-primary text-primary' : 'bg-black border-primary/30 text-primary/90'}`}>
                          <div className="relative z-10">{msg.text}</div>
                          {msg.encryptedText && (
                            <div className="mt-2 pt-2 border-t border-primary/20 text-[10px] opacity-40 break-all leading-tight font-mono">
                              {msg.encryptedText}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {isTyping && (
                <div className="text-primary/50 font-mono text-xs animate-pulse">
                  ...transmitting
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-black/80 border-t border-border">
              <form onSubmit={handleSend} className="flex gap-4">
                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Enter secure message..."
                  className="flex-1 bg-black border-primary/30 text-primary placeholder:text-primary/30 font-mono rounded-none focus-visible:ring-primary/50"
                />
                <Button 
                  type="submit" 
                  disabled={!text.trim() || sendMessage.isPending}
                  className="bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-black rounded-none font-mono px-8"
                >
                  <Send className="w-4 h-4 mr-2" /> SEND
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center font-mono space-y-4">
              <Shield className="w-16 h-16 text-primary/20 mx-auto" />
              <p className="text-primary/40 uppercase tracking-widest text-sm">[ SELECT NODE TO ESTABLISH LINK ]</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}