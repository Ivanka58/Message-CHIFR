import { useState } from "react";
import { Link } from "wouter";
import { useLang } from "../../lib/lang";
import { ShieldCheck } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function useSetting<T>(key: string, def: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    const s = localStorage.getItem("shifr_sec_" + key);
    return s !== null ? (JSON.parse(s) as T) : def;
  });
  const set = (v: T) => {
    setVal(v);
    localStorage.setItem("shifr_sec_" + key, JSON.stringify(v));
  };
  return [val, set];
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 flex-shrink-0 transition-colors border ${
        value ? "bg-primary/30 border-primary" : "bg-black border-primary/30"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 transition-all ${
          value ? "left-6 bg-primary shadow-[0_0_6px_rgba(0,255,100,0.8)]" : "left-0.5 bg-primary/30"
        }`}
      />
    </button>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
  danger,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  danger?: boolean;
}) {
  const activeColor = danger ? "bg-destructive/30 border-destructive text-destructive" : "bg-primary/30 border-primary text-primary shadow-[0_0_6px_rgba(0,255,100,0.5)]";
  return (
    <div className="flex flex-shrink-0 border border-primary/20 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 text-xs font-mono uppercase tracking-wide transition-colors ${
            value === opt.value
              ? activeColor
              : "text-primary/40 hover:text-primary/70 hover:bg-primary/5"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Row({
  label,
  desc,
  control,
}: {
  label: string;
  desc: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-4 px-4 border-b border-primary/10 last:border-0">
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-mono text-sm text-primary uppercase tracking-wide font-bold leading-tight">{label}</p>
        <p className="font-mono text-xs text-primary/40 mt-0.5 leading-snug">{desc}</p>
      </div>
      {control}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-primary/20 bg-black/30">
      <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
        <span className="font-mono text-xs text-primary uppercase tracking-widest font-bold">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Cybersecurity() {
  const { t } = useLang();

  // Privacy
  const [forwardRestrict, setForwardRestrict] = useSetting<"all" | "contacts" | "none">("forwardRestrict", "contacts");
  const [hidePhone, setHidePhone] = useSetting<boolean>("hidePhone", true);
  const [onlineVis, setOnlineVis] = useSetting<"all" | "contacts" | "none">("onlineVis", "contacts");
  const [whoCanMsg, setWhoCanMsg] = useSetting<"all" | "contacts" | "none">("whoCanMsg", "all");
  const [hideRead, setHideRead] = useSetting<boolean>("hideRead", false);

  // Chats
  const [burnAfter, setBurnAfter] = useSetting<"off" | "5s" | "30s" | "1m">("burnAfter", "off");
  const [screenshotBlock, setScreenshotBlock] = useSetting<boolean>("screenshotBlock", false);
  const [invisPhoto, setInvisPhoto] = useSetting<boolean>("invisPhoto", false);
  const [confirmSend, setConfirmSend] = useSetting<boolean>("confirmSend", false);
  const [quickDel, setQuickDel] = useSetting<boolean>("quickDel", true);

  // Account
  const [appMask, setAppMask] = useSetting<"off" | "calculator" | "weather" | "notes">("appMask", "off");
  const [screenLock, setScreenLock] = useSetting<boolean>("screenLock", false);
  const [biometrics, setBiometrics] = useSetting<boolean>("biometrics", false);

  // Network
  const [airGap, setAirGap] = useSetting<boolean>("airGap", false);
  const [cacheClean, setCacheClean] = useSetting<"daily" | "weekly" | "never">("cacheClean", "weekly");
  const [trafficEnc, setTrafficEnc] = useSetting<boolean>("trafficEnc", true);
  const [metrics, setMetrics] = useSetting<boolean>("metrics", false);

  // Bots
  const [botVerif, setBotVerif] = useSetting<boolean>("botVerif", true);
  const [botRate, setBotRate] = useSetting<"5" | "10" | "20">("botRate", "10");
  const [groupBots, setGroupBots] = useSetting<"allowed" | "forbidden" | "verified">("groupBots", "verified");

  // Notifications
  const [notifMimicry, setNotifMimicry] = useSetting<boolean>("notifMimicry", false);
  const [hiddenNotif, setHiddenNotif] = useSetting<"always" | "unlocked" | "never">("hiddenNotif", "unlocked");

  const opt3 = (a: string, b: string, c: string) => [
    { value: "all" as const, label: t.optAll },
    { value: "contacts" as const, label: t.optContacts },
    { value: "none" as const, label: t.optNone },
  ];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 relative z-10 h-full overflow-y-auto pb-12">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-xs font-mono text-primary/50 hover:text-primary uppercase tracking-widest transition-colors">
          {t.settingsBack}
        </Link>
      </div>

      <div className="flex items-center gap-4 border-b border-primary/20 pb-6">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-primary/10 border border-primary/30 text-primary">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-mono text-primary font-bold uppercase tracking-widest">{t.cyberTitle}</h1>
          <p className="text-primary/50 font-mono text-xs uppercase mt-1">{t.cyberSubtitle}</p>
        </div>
      </div>

      {/* 1. Privacy */}
      <Section title={t.privacySection}>
        <Row
          label={t.forwardRestrict}
          desc={t.forwardRestrictDesc}
          control={
            <Segment
              value={forwardRestrict}
              onChange={setForwardRestrict}
              options={[
                { value: "all", label: t.forwardAll },
                { value: "contacts", label: t.forwardContacts },
                { value: "none", label: t.forwardNone },
              ]}
            />
          }
        />
        <Row label={t.hidePhone} desc={t.hidePhoneDesc} control={<Toggle value={hidePhone} onChange={setHidePhone} />} />
        <Row
          label={t.onlineVisibility}
          desc={t.onlineVisDesc}
          control={<Segment value={onlineVis} onChange={setOnlineVis} options={opt3(t.optAll, t.optContacts, t.optNone)} />}
        />
        <Row
          label={t.whoCanMessage}
          desc={t.whoCanMessageDesc}
          control={<Segment value={whoCanMsg} onChange={setWhoCanMsg} options={opt3(t.optAll, t.optContacts, t.optNone)} />}
        />
        <Row label={t.hideReadReceipts} desc={t.hideReadReceiptsDesc} control={<Toggle value={hideRead} onChange={setHideRead} />} />
      </Section>

      {/* 2. Chats */}
      <Section title={t.chatsSection}>
        <Row
          label={t.burnAfterRead}
          desc={t.burnAfterReadDesc}
          control={
            <Segment
              value={burnAfter}
              onChange={setBurnAfter}
              options={[
                { value: "off", label: t.burnOff },
                { value: "5s", label: t.burn5s },
                { value: "30s", label: t.burn30s },
                { value: "1m", label: t.burn1m },
              ]}
            />
          }
        />
        <Row label={t.screenshotBlock} desc={t.screenshotBlockDesc} control={<Toggle value={screenshotBlock} onChange={setScreenshotBlock} />} />
        <Row label={t.invisiblePhoto} desc={t.invisiblePhotoDesc} control={<Toggle value={invisPhoto} onChange={setInvisPhoto} />} />
        <Row label={t.confirmSend} desc={t.confirmSendDesc} control={<Toggle value={confirmSend} onChange={setConfirmSend} />} />
        <Row label={t.quickDeleteMsg} desc={t.quickDeleteDesc} control={<Toggle value={quickDel} onChange={setQuickDel} />} />
      </Section>

      {/* 3. Account Privacy */}
      <Section title={t.accountSection}>
        <Row
          label={t.appMasquerade}
          desc={t.appMasqueradeDesc}
          control={
            <Segment
              value={appMask}
              onChange={setAppMask}
              options={[
                { value: "off", label: t.maskOff },
                { value: "calculator", label: t.maskCalc },
                { value: "weather", label: t.maskWeather },
                { value: "notes", label: t.maskNotes },
              ]}
            />
          }
        />
        <Row label={t.screenLock} desc={t.screenLockDesc} control={<Toggle value={screenLock} onChange={setScreenLock} />} />
        <Row label={t.biometrics} desc={t.biometricsDesc} control={<Toggle value={biometrics} onChange={setBiometrics} />} />
      </Section>

      {/* 4. Network */}
      <Section title={t.networkSection}>
        <Row label={t.airGap} desc={t.airGapDesc} control={<Toggle value={airGap} onChange={setAirGap} />} />
        <Row
          label={t.autoClearCache}
          desc={t.autoClearCacheDesc}
          control={
            <Segment
              value={cacheClean}
              onChange={setCacheClean}
              options={[
                { value: "daily", label: t.cacheDaily },
                { value: "weekly", label: t.cacheWeekly },
                { value: "never", label: t.cacheNever },
              ]}
            />
          }
        />
        <Row label={t.trafficEncryption} desc={t.trafficEncryptionDesc} control={<Toggle value={trafficEnc} onChange={setTrafficEnc} />} />
        <Row label={t.usageMetrics} desc={t.usageMetricsDesc} control={<Toggle value={metrics} onChange={setMetrics} />} />
      </Section>

      {/* 5. Bots */}
      <Section title={t.botsSection}>
        <Row label={t.botVerification} desc={t.botVerificationDesc} control={<Toggle value={botVerif} onChange={setBotVerif} />} />
        <Row
          label={t.botRateLimit}
          desc={t.botRateLimitDesc}
          control={
            <Segment
              value={botRate}
              onChange={setBotRate}
              options={[
                { value: "5", label: t.rate5 },
                { value: "10", label: t.rate10 },
                { value: "20", label: t.rate20 },
              ]}
            />
          }
        />
        <Row
          label={t.groupBots}
          desc={t.groupBotsDesc}
          control={
            <Segment
              value={groupBots}
              onChange={setGroupBots}
              options={[
                { value: "allowed", label: t.botsAllowed },
                { value: "forbidden", label: t.botsForbidden },
                { value: "verified", label: t.botsVerified },
              ]}
            />
          }
        />
      </Section>

      {/* 6. Notifications */}
      <Section title={t.notifsSection}>
        <Row label={t.notifMimicry} desc={t.notifMimicryDesc} control={<Toggle value={notifMimicry} onChange={setNotifMimicry} />} />
        <Row
          label={t.hiddenNotifText}
          desc={t.hiddenNotifTextDesc}
          control={
            <Segment
              value={hiddenNotif}
              onChange={setHiddenNotif}
              options={[
                { value: "always", label: t.notifAlways },
                { value: "unlocked", label: t.notifUnlocked },
                { value: "never", label: t.notifNever },
              ]}
            />
          }
        />
        <Row
          label={t.vibroPassword}
          desc={t.vibroPasswordDesc}
          control={
            <button className="text-xs font-mono text-primary/60 border border-primary/30 px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors uppercase tracking-wide flex-shrink-0">
              {t.vibroSet}
            </button>
          }
        />
      </Section>
    </div>
  );
}
