import { Link } from "wouter";
import { useLang } from "../lib/lang";
import { HardDrive, ShieldAlert, ChevronRight } from "lucide-react";

export default function Settings() {
  const { t } = useLang();

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 relative z-10 h-full overflow-y-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-mono text-primary font-bold uppercase border-b border-primary/20 pb-4 inline-block pr-12">
          {t.settingsTitle}
        </h1>
        <p className="text-primary/50 font-mono text-sm uppercase">{t.settingsSubtitle}</p>
      </div>

      <div className="border border-primary/20 divide-y divide-primary/10 bg-black/30">
        {/* Двойное дно */}
        <Link
          href="/settings/double-bottom"
          data-testid="settings-row-double-bottom"
          className="flex items-center gap-4 px-6 py-5 hover:bg-primary/5 transition-colors group cursor-pointer"
        >
          <div className="w-9 h-9 flex items-center justify-center bg-primary/10 border border-primary/30 text-primary group-hover:bg-primary/20 transition-colors">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm text-primary uppercase tracking-wider font-bold">{t.doubleBottomTitle}</h3>
            <p className="font-mono text-xs text-primary/50 mt-0.5 truncate">{t.doubleBottomSubDesc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary/40 group-hover:text-primary/70 transition-colors flex-shrink-0" />
        </Link>

        {/* Экстренная очистка */}
        <Link
          href="/settings/panic"
          data-testid="settings-row-panic"
          className="flex items-center gap-4 px-6 py-5 hover:bg-destructive/5 transition-colors group cursor-pointer"
        >
          <div className="w-9 h-9 flex items-center justify-center bg-destructive/10 border border-destructive/30 text-destructive group-hover:bg-destructive/20 transition-colors">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm text-destructive uppercase tracking-wider font-bold">{t.panicTitle}</h3>
            <p className="font-mono text-xs text-destructive/50 mt-0.5 truncate">{t.panicSubDesc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-destructive/40 group-hover:text-destructive/70 transition-colors flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}
