import { Link, useLocation } from "wouter";
import { useSession } from "../lib/session";
import { useLang } from "../lib/lang";
import { MessageSquare, Settings, LogOut, Menu, X } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";
  return (
    <div className={`${dim} flex-shrink-0 flex items-center justify-center bg-primary/20 border border-primary/50 shadow-[0_0_8px_rgba(0,255,100,0.3)]`}>
      <span className="font-mono font-bold text-primary select-none">{getInitials(name)}</span>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { session, logout } = useSession();
  const { t } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName =
    localStorage.getItem("shifr_display_name") || session?.name || "??";

  // Swipe gesture
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 50 && dy < 80) {
      if (dx > 0 && !sidebarOpen) setSidebarOpen(true);
      if (dx < 0 && sidebarOpen) setSidebarOpen(false);
    }
  }, [sidebarOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const navItems = [
    { href: "/chat", icon: <MessageSquare className="w-5 h-5" />, label: t.navComms, testId: "nav-chat" },
    { href: "/settings", icon: <Settings className="w-5 h-5" />, label: t.navSettings, testId: "nav-settings" },
  ];

  const sidebarContent = (
    <>
      {/* Logo + avatar */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
          <Avatar name={displayName} />
          <span className="font-bold tracking-widest text-lg text-primary uppercase truncate">SHIFR</span>
        </Link>
        {/* Close button — mobile only */}
        <button
          className="md:hidden text-primary/50 hover:text-primary p-1 transition-colors"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={item.href === "/settings" ? location.startsWith("/settings") : location === item.href}
            testId={item.testId}
          />
        ))}
      </nav>

      {/* Bottom: profile + logout */}
      <div className="border-t border-border p-3 space-y-1 flex-shrink-0">
        <NavItem
          href="/profile"
          icon={<Avatar name={displayName} size="sm" />}
          label={displayName}
          active={location === "/profile"}
          testId="nav-profile"
          noGlow
        />
        <button
          data-testid="button-disconnect"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border-l-2 border-transparent font-mono text-sm uppercase"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>{t.navDisconnect}</span>
        </button>
      </div>
    </>
  );

  return (
    <div
      className="flex h-screen w-full bg-background overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Desktop sidebar (always visible ≥ md) ── */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col">
        {sidebarContent}
      </aside>

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (slide in) ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 bg-card border-r border-border flex flex-col md:hidden transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-border bg-card flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-primary/70 hover:text-primary transition-colors p-1"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold tracking-widest text-primary uppercase font-mono">SHIFR</span>
          <div className="flex-1" />
          <Link href="/profile">
            <Avatar name={displayName} />
          </Link>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#00ff64_1px,transparent_1px),linear-gradient(to_bottom,#00ff64_1px,transparent_1px)] bg-[size:2rem_2rem]" />
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  testId,
  noGlow,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  testId: string;
  noGlow?: boolean;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={`flex items-center gap-3 px-3 py-3 transition-colors font-mono text-sm uppercase border-l-2 ${
        active
          ? `bg-primary/20 text-primary border-primary ${noGlow ? "" : "shadow-[inset_0_0_10px_rgba(0,255,100,0.05)]"}`
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground border-transparent"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
