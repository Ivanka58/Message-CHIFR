import { Link, useLocation } from "wouter";
import { useSession } from "../lib/session";
import { useLang } from "../lib/lang";
import { Shield, MessageSquare, Settings, LogOut } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useSession();
  const { t } = useLang();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-16 md:w-64 border-r border-border bg-card flex flex-col justify-between">
        <div>
          <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-border">
            <Shield className="w-6 h-6 text-primary" />
            <span className="hidden md:inline ml-3 font-bold tracking-widest text-lg text-primary uppercase">SHIFR</span>
          </div>
          <nav className="p-2 md:p-4 space-y-2">
            <NavItem href="/chat" icon={<MessageSquare className="w-5 h-5" />} label={t.navComms} active={location === "/chat"} />
            <NavItem href="/settings" icon={<Settings className="w-5 h-5" />} label={t.navSettings} active={location.startsWith("/settings")} />
          </nav>
        </div>
        <div className="p-2 md:p-4 border-t border-border">
          <button
            data-testid="button-disconnect"
            onClick={logout}
            className="w-full flex items-center justify-center md:justify-start px-3 py-3 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline ml-3 font-mono text-sm uppercase">{t.navDisconnect}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#00ff64_1px,transparent_1px),linear-gradient(to_bottom,#00ff64_1px,transparent_1px)] bg-[size:2rem_2rem]" />
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      data-testid={`nav-${href.replace("/", "")}`}
      className={`flex items-center justify-center md:justify-start px-3 py-3 transition-colors uppercase text-sm font-mono ${
        active
          ? "bg-primary/20 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground border-l-2 border-transparent"
      }`}
    >
      {icon}
      <span className="hidden md:inline ml-3">{label}</span>
    </Link>
  );
}
