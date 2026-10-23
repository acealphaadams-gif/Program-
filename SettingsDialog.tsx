import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LEVELS, PREFERENCES, ROLES, type Profile, type Settings, clearProfile } from "@/lib/alpha/profile";
import { clearAllSessions } from "@/lib/alpha/sessions";
import { speechSupported } from "@/lib/alpha/voice";
import { useOffline, loadOffline, deleteOffline, OFFLINE_SIZE } from "@/lib/alpha/offline";
import { cn } from "@/lib/utils";

export function SettingsDialog({
  open, onOpenChange, profile, settings, onProfile, onSettings, backend,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: Profile;
  settings: Settings;
  onProfile: (p: Profile) => void;
  onSettings: (s: Settings) => void;
  backend: "checking" | "ok" | "missing" | "unreachable";
}) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => { if (open) setDraft(profile); }, [open, profile]);
  const set = (patch: Partial<Settings>) => onSettings({ ...settings, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Saved on this device only.</DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Profile</h3>
          <div className="space-y-1.5">
            <Label htmlFor="set-name">Preferred name</Label>
            <Input id="set-name" value={draft.name} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <Chips label="Role" options={ROLES} value={[draft.role]} onToggle={(r) => setDraft({ ...draft, role: r as Profile["role"] })} />
          <Chips label="Level" options={LEVELS} value={[draft.level]} onToggle={(l) => setDraft({ ...draft, level: l as Profile["level"] })} />
          <Chips label="Learning preferences" options={PREFERENCES} value={draft.preferences}
            onToggle={(p) => setDraft({ ...draft, preferences: draft.preferences.includes(p) ? draft.preferences.filter((x) => x !== p) : [...draft.preferences, p] })} />
          <Button size="sm" disabled={!draft.name.trim()} onClick={() => { onProfile({ ...draft, name: draft.name.trim() }); onOpenChange(false); }}>
            Save profile
          </Button>
        </section>

        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Tutor & app</h3>
          <Row id="s-soc" label="Socratic hints" hint="Alpha guides you with questions instead of full answers."
            checked={settings.socratic} onChange={(v) => set({ socratic: v })} />
          <Row id="s-theme" label="Calm light theme" hint="A calm, easy-on-the-eyes reading palette."
            checked={settings.theme === "light"} onChange={(v) => set({ theme: v ? "light" : "navy" })} />
          <Row id="s-enter" label="Enter sends message" hint="Off: use the send button; Enter adds a new line."
            checked={settings.enterToSend} onChange={(v) => set({ enterToSend: v })} />
          <Row id="s-read" label="Auto read-aloud answers" disabled={!speechSupported()}
            hint={speechSupported() ? "Speaks each new answer." : "Not supported in this browser."}
            checked={settings.readAloud} onChange={(v) => set({ readAloud: v })} />
          <OfflineSection settings={settings} onSettings={onSettings} />
          <div className="rounded-lg border p-3 text-sm">
            <div className="font-medium">Tutor service</div>
            <p className="text-muted-foreground">
              {backend === "ok" && "Connected and configured."}
              {backend === "checking" && "Checking…"}
              {backend === "missing" && "Server AI key is not configured. See README → Backend configuration."}
              {backend === "unreachable" && "Server unreachable. Static-only hosting can't run the tutor (see README)."}
            </p>
          </div>
        </section>

        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { if (confirm("Delete all saved chats?")) clearAllSessions(); }}>Delete all chats</Button>
            <Button variant="destructive" size="sm" onClick={() => { if (confirm("Reset profile and start setup again? Chats are kept.")) { clearProfile(); window.location.assign("/"); } }}>Reset profile</Button>
            <Button variant="outline" size="sm" className="ml-2" onClick={() => { window.location.assign("/sign-in"); }}>Account / Sign in</Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function OfflineSection({ settings, onSettings }: { settings: Settings; onSettings: (s: Settings) => void }) {
  const off = useOffline();
  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="font-medium">Offline AI (on this device)</div>
      {off.status === "unsupported" && <p className="text-muted-foreground">Not available here: {off.reason}</p>}
      {off.status === "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 text-muted-foreground">
            {off.cached ? "Model is downloaded and ready to load." : `Downloads a small AI model (${OFFLINE_SIZE}) once; answers then work without internet. Weaker than the online tutor.`}
          </p>
          <Button size="sm" variant="outline" onClick={() => void loadOffline()}>{off.cached ? "Load" : "Download & load"}</Button>
        </div>
      )}
      {off.status === "loading" && (
        <p className="text-muted-foreground" aria-live="polite">
          Loading… {Math.round(off.progress * 100)}% <span className="block text-xs">{off.text.slice(0, 80)}</span>
        </p>
      )}
      {off.status === "ready" && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 text-muted-foreground">Offline AI is loaded.</p>
          <Button size="sm" variant="outline" onClick={() => void deleteOffline()}>Delete model</Button>
        </div>
      )}
      {off.status === "error" && <p className="text-destructive">{off.message}</p>}
      {off.status === "ready" && (
        <Row id="s-prefer-offline" label="Prefer offline AI" hint="Answers come from this device; works without internet once loaded."
          checked={settings.preferOffline} onChange={(v) => onSettings({ ...settings, preferOffline: v })} />
      )}
    </div>
  );
}

function Row({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function Chips({ label, options, value, onToggle }: { label: string; options: readonly string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value.includes(o)} onClick={() => onToggle(o)}
            className={cn("rounded-full border px-2.5 py-1 text-xs", value.includes(o) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
