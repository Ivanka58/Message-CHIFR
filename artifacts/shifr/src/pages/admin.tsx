import { useAdminListUsers, useAdminListMessages, getAdminListUsersQueryKey, getAdminListMessagesQueryKey } from "@workspace/api-client-react";
import { Terminal, Database, Activity } from "lucide-react";
import { format } from "date-fns";

export default function Admin() {
  const { data: users = [] } = useAdminListUsers({ query: { queryKey: getAdminListUsersQueryKey() } });
  const { data: messages = [] } = useAdminListMessages({ query: { queryKey: getAdminListMessagesQueryKey() } });

  return (
    <div className="p-8 h-full w-full overflow-y-auto relative z-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-primary/20 pb-4">
          <div>
            <h1 className="text-3xl font-mono text-primary font-bold uppercase flex items-center gap-3">
              <Terminal className="w-8 h-8" />
              Network Overwatch
            </h1>
            <p className="text-primary/50 font-mono text-sm uppercase mt-2">Administrative Node Access</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="font-mono text-primary text-sm">SYSTEM NOMINAL</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Users Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary border-b border-primary/20 pb-2">
              <Database className="w-4 h-4" />
              <h2 className="font-mono uppercase tracking-widest text-sm font-bold">Registered Nodes</h2>
            </div>
            <div className="bg-black/40 border border-primary/20">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="border-b border-primary/20 bg-primary/5 text-primary/70">
                    <th className="p-3 font-normal uppercase">ID / Name</th>
                    <th className="p-3 font-normal uppercase">Identifier</th>
                    <th className="p-3 font-normal uppercase text-right">Comms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-primary/5 transition-colors text-primary/90">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-primary font-bold">{user.name}</span>
                          <span className="text-[10px] text-primary/50 opacity-60">ID: {user.id}</span>
                        </div>
                      </td>
                      <td className="p-3">{user.phone}</td>
                      <td className="p-3 text-right">
                        <span className="inline-block px-2 py-1 bg-primary/10 border border-primary/30 text-primary text-xs">
                          {user.messageCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-primary/40 text-xs">NO NODES DETECTED</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Messages */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary border-b border-primary/20 pb-2">
              <Activity className="w-4 h-4" />
              <h2 className="font-mono uppercase tracking-widest text-sm font-bold">Intercepted Traffic</h2>
            </div>
            <div className="bg-black/40 border border-primary/20 divide-y divide-primary/10">
              {messages.map(msg => (
                <div key={msg.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start font-mono text-[10px] text-primary/50">
                    <span>ROUTE: {msg.fromUserId} → {msg.toUserId}</span>
                    <span>{format(new Date(msg.timestamp), 'HH:mm:ss.SSS')}</span>
                  </div>
                  <div className="font-mono text-sm text-primary break-all">
                    {msg.encryptedText || msg.text}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="p-4 text-center font-mono text-primary/40 text-xs">NO TRAFFIC DETECTED</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}