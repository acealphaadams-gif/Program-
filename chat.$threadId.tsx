import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, RotateCcw, Lightbulb, AlertTriangle, ImagePlus, FileText } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/alpha/Sidebar";
import { SettingsDialog } from "@/components/alpha/SettingsDialog";
import { Notifications } from "@/components/alpha/Notifications";
import { Composer } from "@/components/alpha/Composer";
import { MessageView, TypingIndicator, textOf } from "@/components/alpha/MessageView";
import { AlphaLogo } from "@/components/alpha/Logo";
import { useAlphaState, SUBJECTS, type Profile, type Settings } from "@/lib/alpha/profile";
import { isValidId, loadMessages, newSessionId, saveMessages } from "@/lib/alpha/sessions";
import { onStorageError } from "@/lib/alpha/storage";
import { speak } from "@/lib/alpha/voice";
import { offlineReady, OfflineTransport } from "@/lib/alpha/offline";
import { ImageStudioDialog, type GeneratedImageAsset } from "@/components/alpha/ImageStudioDialog";
import { CanvasDialog } from "@/components/alpha/CanvasDialog";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Alpha AI Tutor" },
      { name: "description", content: "Ask Alpha AI for step-by-step help with your Uganda curriculum subjects." },
      { property: "og:title", content: "Chat with Alpha AI" },
      { property: "og:description", content: "Step-by-step tutoring for Ugandan learners and teachers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

type Backend = "checking" | "ok" | "missing" | "unreachable";

function ChatPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const { ready, profile, settings, setProfile, setSettings } = useAlphaState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [imageStudioOpen, setImageStudioOpen] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasSeed, setCanvasSeed] = useState<string | undefined>(undefined);
  const [canvasImageSeed, setCanvasImageSeed] = useState<GeneratedImageAsset | undefined>(undefined);
  const [backend, setBackend] = useState<Backend>("checking");
  const [storageErr, setStorageErr] = useState<string | null>(null);

  useEffect(() => { const off = onStorageError(setStorageErr); return () => { off(); }; }, []);
  useEffect(() => {
    if (ready && !profile) navigate({ to: "/", replace: true });
  }, [ready, profile, navigate]);
  useEffect(() => {
    if (!isValidId(threadId)) navigate({ to: "/chat/$threadId", params: { threadId: newSessionId() }, replace: true });
  }, [threadId, navigate]);
  useEffect(() => {
    let alive = true;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setBackend(d.configured ? "ok" : "missing"))
      .catch(() => alive && setBackend("unreachable"));
    return () => { alive = false; };
  }, []);

  const newChat = useCallback(() => {
    setMenuOpen(false);
    navigate({ to: "/chat/$threadId", params: { threadId: newSessionId() } });
  }, [navigate]);

  if (!ready || !profile || !isValidId(threadId)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background" aria-busy="true">
        <AlphaLogo className="h-14 w-14 animate-pulse" />
      </main>
    );
  }

  const sidebar = (
    <Sidebar activeId={threadId} profile={profile} onNew={newChat}
      onOpenSettings={() => { setMenuOpen(false); setSettingsOpen(true); }}
      onNavigate={() => setMenuOpen(false)} onDeletedActive={newChat} />
  );

  return (
    <div className="flex h-dvh bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border md:block">{sidebar}</aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2 sm:px-4">
          <button className="rounded-lg p-2 hover:bg-muted md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="md:hidden"><AlphaLogo decorative className="h-7 w-7" /></div>
          <label htmlFor="mode" className="sr-only">Alpha mode</label>
          <select id="mode" value={settings.mode} onChange={(e) => setSettings({ ...settings, mode: e.target.value as Settings["mode"] })}
            className="rounded-lg border bg-card px-2 py-1.5 text-sm">
            <option value="tutor">Tutor</option>
            <option value="coding">Coding</option>
            <option value="translate">Translate</option>
          </select>
          {settings.mode === "tutor" && (
            <>
              <label htmlFor="subject" className="sr-only">Subject focus</label>
              <select id="subject" value={settings.subject} onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
                className="max-w-[9.5rem] rounded-lg border bg-card px-2 py-1.5 text-sm sm:max-w-none">
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </>
          )}
          {settings.mode === "translate" && (
            <>
              <label htmlFor="target-lang" className="sr-only">Translate into</label>
              <input id="target-lang" value={settings.targetLanguage} maxLength={40} placeholder="Target language, e.g. Luganda"
                onChange={(e) => setSettings({ ...settings, targetLanguage: e.target.value })}
                className="w-40 rounded-lg border bg-card px-2 py-1.5 text-sm" />
            </>
          )}
          <button
            onClick={() => { setSettings({ ...settings, socratic: !settings.socratic }); toast(settings.socratic ? "Full explanations on" : "Socratic hints on — Alpha will guide you step by step"); }}
            aria-pressed={settings.socratic}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition ${settings.socratic ? "border-primary bg-accent text-primary" : "hover:bg-muted"}`}
            title="Socratic hints: Alpha asks guiding questions instead of giving the answer"
          >
            <Lightbulb className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Hints</span>
          </button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => setCanvasOpen(true)} className="gap-1.5 px-2 sm:px-3" title="Open Canvas workspace"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Canvas</span></Button>
          <Button size="sm" variant="outline" onClick={() => setImageStudioOpen(true)} className="gap-1.5 px-2 sm:px-3" title="Generate an image"><ImagePlus className="h-4 w-4" /><span className="hidden sm:inline">Create image</span></Button>
          <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground sm:inline">{profile.role} mode</span>
          <Notifications />
        </header>

        {storageErr && (
          <div role="alert" className="flex items-center gap-2 bg-destructive/15 px-4 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden /> {storageErr}
          </div>
        )}

        <ChatWindow key={threadId} threadId={threadId} profile={profile} settings={settings} backend={backend} onSaveToCanvas={(text) => { setCanvasSeed(text); setCanvasOpen(true); }} />
      </div>

      <ImageStudioDialog open={imageStudioOpen} onOpenChange={setImageStudioOpen} onUseInCanvas={(image) => { setImageStudioOpen(false); setCanvasSeed(undefined); setCanvasImageSeed(image); setCanvasOpen(true); }} />
      <CanvasDialog open={canvasOpen} onOpenChange={(open) => { setCanvasOpen(open); if (!open) { setCanvasSeed(undefined); setCanvasImageSeed(undefined); } }} initialText={canvasSeed} initialImage={canvasImageSeed} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} profile={profile} settings={settings}
        onProfile={setProfile} onSettings={setSettings} backend={backend} />
    </div>
  );
}

function friendlyError(err: Error) {
  try {
    const parsed = JSON.parse(err.message);
    if (parsed?.error) return String(parsed.error);
  } catch { /* not JSON */ }
  if (/fetch|network/i.test(err.message)) return "Network problem — check your internet connection and retry.";
  return err.message?.slice(0, 200) || "Something went wrong.";
}

function ChatWindow({ threadId, profile, settings, backend, onSaveToCanvas }: { threadId: string; profile: Profile; settings: Settings; backend: Backend; onSaveToCanvas: (text: string) => void }) {
  const initial = useMemo<UIMessage[]>(() => loadMessages(threadId), [threadId]);
  const ctxRef = useRef({ profile, settings });
  ctxRef.current = { profile, settings };

  const tutorCtx = useCallback(() => {
    const { profile: p, settings: s } = ctxRef.current;
    return {
      name: p.name, role: p.role, level: p.level, preferences: p.preferences,
      socratic: s.socratic, subject: s.subject === "Any subject" ? "" : s.subject,
      mode: s.mode, targetLanguage: s.targetLanguage,
    };
  }, []);

  // Track connectivity so a loaded offline model takes over automatically when the internet drops.
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const offlineFallback = !online || backend === "missing" || backend === "unreachable";
  const useOfflineAI = (settings.preferOffline || offlineFallback) && offlineReady();
  const transport = useMemo(
    () =>
      useOfflineAI
        ? new OfflineTransport(tutorCtx)
        : new DefaultChatTransport({ api: "/api/chat", body: () => ({ context: tutorCtx() }) }),
    [useOfflineAI, tutorCtx],
  );

  const { messages, sendMessage, status, stop, error, regenerate, clearError } = useChat({ id: threadId, messages: initial, transport });
  const busy = status === "submitted" || status === "streaming";
  const endRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef(status);

  // Persist whenever a turn settles (finished, stopped or errored).
  useEffect(() => {
    if (status === "ready" || status === "error") saveMessages(threadId, messages);
    if (prevStatus.current === "streaming" && status === "ready" && settings.readAloud) {
      const last = messages.at(-1);
      if (last?.role === "assistant") speak(textOf(last));
    }
    prevStatus.current = status;
  }, [status, messages, threadId, settings.readAloud]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, status]);

  const send = useCallback((text: string, files: FileUIPart[]) => {
    if (error) clearError();
    sendMessage({ text, files });
  }, [error, clearError, sendMessage]);

  // Learning Workspace actions can hand a prepared prompt to the tutor once.
  useEffect(() => {
    if (busy) return;
    let prompt = "";
    try {
      prompt = window.sessionStorage.getItem("alpha-learning-workspace:pending-prompt") ?? "";
      if (prompt) window.sessionStorage.removeItem("alpha-learning-workspace:pending-prompt");
    } catch { /* session storage may be blocked */ }
    if (prompt) send(prompt, []);
  }, [threadId, busy, send]);

  const suggestions =
    settings.mode === "coding"
      ? ["Build a Python program that quizzes learners on multiplication tables", "Explain loops in JavaScript with a small example", "Find the bug in my code and explain the fix"]
      : settings.mode === "translate"
        ? [`Translate "Good morning, how are you?" into ${settings.targetLanguage || "another language"}`, "Translate a short paragraph and explain the grammar", "Give me 10 useful phrases with translations"]
        : profile.role === "Teacher"
          ? ["Draft a 40-minute S2 lesson plan on simultaneous equations", "Write 5 UNEB-style questions on photosynthesis with a marking guide", "Common misconceptions learners have about fractions"]
          : ["Solve step by step: 2x² − 5x + 3 = 0", "Explain photosynthesis simply with a Ugandan example", "Give me 3 practice questions on percentages"];

  const unavailable = (backend === "missing" || backend === "unreachable" || !online) && !useOfflineAI;
  const lastIsUser = messages.at(-1)?.role === "user";

  return (
    <>
      <main className="flex-1 overflow-y-auto" aria-live="polite">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          {messages.length === 0 && (
            <div className="pt-10 text-center animate-in fade-in duration-500">
              <AlphaLogo decorative className="mx-auto h-20 w-20" />
              <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Hi {profile.name}, what shall we {profile.role === "Teacher" ? "prepare" : "learn"} today?</h1>
              <p className="mt-2 text-sm text-muted-foreground">{profile.level} · NCDC curriculum · {settings.socratic ? "Socratic hints on" : "Full step-by-step answers"}</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {suggestions.map((s) => (
                  <button key={s} disabled={unavailable} onClick={() => send(s, [])}
                    className="rounded-xl border bg-card p-3 text-left text-sm transition hover:border-primary disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <MessageView key={m.id} message={m} streaming={busy && i === messages.length - 1 && m.role === "assistant"} onSaveToCanvas={m.role === "assistant" ? onSaveToCanvas : undefined} />
          ))}
          {status === "submitted" && <TypingIndicator />}
          {error && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
              <span className="flex-1">{friendlyError(error)}</span>
              <Button size="sm" variant="outline" onClick={() => { clearError(); regenerate(); }}>
                <RotateCcw className="mr-1 h-4 w-4" /> Retry
              </Button>
            </div>
          )}
          {!busy && !error && status === "ready" && lastIsUser && messages.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Reply was stopped. <button className="text-primary underline" onClick={() => regenerate()}>Generate answer</button>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>
      <Composer busy={busy} disabled={unavailable} enterToSend={settings.enterToSend}
        disabledReason={backend === "missing" ? "The tutor backend isn't configured (no server AI key). Chat is disabled until it's set up." : backend === "unreachable" ? "Can't reach the tutor server. Check your connection, or the app is on static-only hosting." : undefined}
        onSend={send} onStop={stop} />
    </>
  );
}
