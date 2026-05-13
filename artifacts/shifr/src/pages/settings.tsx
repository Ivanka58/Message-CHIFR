import { Link } from "wouter";
import { useLang } from "../lib/lang";
import { HardDrive, ShieldAlert, ShieldCheck, ChevronRight } from "lucide-react";

export default function Settings() {
  const { t } = useLang();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 relative z-10 h-full overflow-y-auto">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-mono text-primary font-bold uppercase border-b border-primary/20 pb-4 inline-block pr-12">
          {t.settingsTitle}
        </h1>
        <p className="text-primary/50 font-mono text-xs uppercase">{t.settingsSubtitle}</p>
      </div>

      <div className="border border-primary/20 divide-y divide-primary/10 bg-black/30">
        <SettingsRow
          href="/settings/cybersecurity"
          icon={<ShieldCheck className="w-4 h-4" />}
          label={t.cyberTitle}
          desc={t.cyberSubDesc}
          color="primary"
          testId="settings-row-cyber"
        />
        <SettingsRow
          href="/settings/double-bottom"
          icon={<HardDrive className="w-4 h-4" />}
          label={t.doubleBottomTitle}
          desc={t.doubleBottomSubDesc}
          color="primary"
          testId="settings-row-double-bottom"
        />
        <SettingsRow
          href="/settings/panic"
          icon={<ShieldAlert className="w-4 h-4" />}
          label={t.panicTitle}
          desc={t.panicSubDesc}
          color="destructive"
          testId="settings-row-panic"
        />
      </div>
    </div>
  );
}

function SettingsRow({
  href, icon, label, desc, color, testId,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: "primary" | "destructive";
  testId: string;
}) {
  const isPrimary = color === "primary";
  return (
    <Link
      href={href}
      data-testid={testId}
      className={`flex items-center gap-4 px-6 py-5 transition-colors group cursor-pointer ${isPrimary ? "hover:bg-primary/5" : "hover:bg-destructive/5"}`}
    >
      <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center border transition-colors ${
        isPrimary
          ? "bg-primary/10 border-primary/30 text-primary group-hover:bg-primary/20"
          : "bg-destructive/10 border-destructive/30 text-destructive group-hover:bg-destructive/20"
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-mono text-sm uppercase tracking-wider font-bold ${isPrimary ? "text-primary" : "text-destructive"}`}>
          {label}
        </h3>
        <p className={`font-mono text-xs mt-0.5 truncate ${isPrimary ? "text-primary/50" : "text-destructive/50"}`}>
          {desc}
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${isPrimary ? "text-primary/40 group-hover:text-primary/70" : "text-destructive/40 group-hover:text-destructive/70"}`} />
    </Link>
  );
}
