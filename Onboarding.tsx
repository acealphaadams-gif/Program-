import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlphaLogo } from "./Logo";
import { LEVELS, PREFERENCES, ROLES, type Profile } from "@/lib/alpha/profile";
import { cn } from "@/lib/utils";
import { BookOpen, GraduationCap } from "lucide-react";

type Phase = "splash" | "form" | "loading" | "welcome";
const DURATION = { splash: 5000, loading: 7000, welcome: 2000 } as const;
const LOADING_STEPS = ["Setting up your profile", "Tuning explanations to your level", "Preparing your study space"];

export function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [phase, setPhase] = useState<Phase>("splash");
  const [profile, setProfile] = useState<Profile | null>(null);
  const doneRef = useRef(false);

  // One timer per phase; cleanup on phase change/unmount prevents races and double transitions.
  useEffect(() => {
    if (phase === "form") return;
    const t = setTimeout(() => {
      if (phase === "splash") setPhase("form");
      else if (phase === "loading") setPhase("welcome");
      else if (phase === "welcome" && profile && !doneRef.current) {
        doneRef.current = true;
        onDone(profile);
      }
    }, DURATION[phase]);
    return () => clearTimeout(t);
  }, [phase, profile, onDone]);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-glow" />
      {phase === "splash" && (
        <div className="relative flex flex-col items-center text-center animate-in fade-in duration-700" role="status" aria-live="polite">
          <AlphaLogo className="h-40 w-40 animate-alpha-float drop-shadow-2xl" />
          <h1 className="mt-6 text-4xl font-bold text-brand">Alpha AI</h1>
          <p className="mt-2 text-muted-foreground">Your Friendly Tutor</p>
          <Button variant="ghost" size="sm" className="mt-8 text-muted-foreground" onClick={() => setPhase("form")}>
            Skip intro
          </Button>
        </div>
      )}
      {phase === "form" && (
        <ProfileForm
          onSubmit={(p) => {
            setProfile(p);
            setPhase("loading");
          }}
        />
      )}
      {phase === "loading" && <LoadingTransition />}
      {phase === "welcome" && profile && (
        <div className="relative text-center animate-in zoom-in-95 fade-in duration-500" role="status" aria-live="polite">
          <AlphaLogo decorative className="mx-auto h-20 w-20" />
          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
            Welcome, <span className="text-brand">{profile.name}</span>!
          </h1>
          <p className="mt-2 text-muted-foreground">
            {profile.role === "Teacher" ? "Let's plan something great for your class." : "Let's learn something new today."}
          </p>
        </div>
      )}
    </main>
  );
}

function LoadingTransition() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), DURATION.loading / LOADING_STEPS.length);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="relative w-full max-w-sm text-center" role="status" aria-live="polite">
      <AlphaLogo decorative className="mx-auto h-24 w-24 animate-pulse" />
      <p className="mt-6 font-display text-lg">{LOADING_STEPS[step]}…</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-brand" style={{ animation: `alpha-progress ${DURATION.loading}ms linear forwards` }} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Personalising your tutor (saved on this device)</p>
    </div>
  );
}

function ProfileForm({ onSubmit }: { onSubmit: (p: Profile) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Profile["role"] | null>(null);
  const [level, setLevel] = useState<Profile["level"] | null>(null);
  const [prefs, setPrefs] = useState<string[]>(["Step-by-step working"]);
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => nameRef.current?.focus(), []);
  const trimmed = name.trim().replace(/\s+/g, " ");
  const errors = {
    name: !trimmed ? "Please tell us what to call you." : trimmed.length > 40 ? "Keep it under 40 characters." : "",
    role: !role ? "Choose Learner or Teacher." : "",
    level: !level ? "Choose your study level." : "",
  };
  const valid = !errors.name && !errors.role && !errors.level;

  return (
    <form
      className="relative w-full max-w-lg rounded-2xl border bg-card/90 p-6 shadow-glow backdrop-blur sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (valid && role && level) onSubmit({ name: trimmed, role, level, preferences: prefs, createdAt: Date.now() });
      }}
    >
      <div className="flex items-center gap-3">
        <AlphaLogo decorative className="h-11 w-11" />
        <div>
          <h1 className="text-xl font-bold">Let's personalise Alpha</h1>
          <p className="text-sm text-muted-foreground">Takes 20 seconds. Saved only on this device.</p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Label htmlFor="pref-name">Preferred name</Label>
        <Input id="pref-name" ref={nameRef} value={name} maxLength={40} autoComplete="given-name"
          onChange={(e) => setName(e.target.value)} placeholder="e.g. Aisha"
          aria-invalid={touched && !!errors.name} aria-describedby="err-name" />
        {touched && errors.name && <p id="err-name" className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">I am a…</legend>
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          {ROLES.map((r) => {
            const Icon = r === "Teacher" ? BookOpen : GraduationCap;
            return (
              <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                className={cn("flex items-center gap-2 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  role === r ? "border-primary bg-accent" : "hover:bg-muted")}>
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <span>
                  <span className="block font-semibold">{r}</span>
                  <span className="block text-xs text-muted-foreground">{r === "Teacher" ? "Lesson plans, marking, ideas" : "Explanations, practice, hints"}</span>
                </span>
              </button>
            );
          })}
        </div>
        {touched && errors.role && <p className="mt-1 text-sm text-destructive">{errors.role}</p>}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">{role === "Teacher" ? "Level I teach" : "Study level"}</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {LEVELS.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)}
              className={cn("rounded-lg border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                level === l ? "border-primary bg-accent" : "hover:bg-muted")}>
              {l}
            </button>
          ))}
        </div>
        {touched && errors.level && <p className="mt-1 text-sm text-destructive">{errors.level}</p>}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Learning preferences <span className="text-muted-foreground">(optional)</span></legend>
        <div className="flex flex-wrap gap-2">
          {PREFERENCES.map((p) => {
            const on = prefs.includes(p);
            return (
              <button key={p} type="button" aria-pressed={on}
                onClick={() => setPrefs((s) => (on ? s.filter((x) => x !== p) : [...s, p]))}
                className={cn("rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {p}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Button type="submit" variant="brand" className="mt-7 h-11 w-full text-base">Start learning</Button>
    </form>
  );
}
