import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlphaWordmark } from "@/components/alpha/Logo";

type Meeting = { id: string; title: string; when: string; kind: string; room: string };
const KEY = "alpha.meetings.v1";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Alpha AI" },
      { name: "description", content: "Schedule and join video meetings for student discussions and teacher meetings." },
      { property: "og:title", content: "Alpha AI Meetings" },
      { property: "og:description", content: "Virtual classrooms, study groups and staff meetings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Meetings,
});

function load(): Meeting[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function Meetings() {
  const [list, setList] = useState<Meeting[]>([]);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [kind, setKind] = useState("Student discussion");
  const [active, setActive] = useState<Meeting | null>(null);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => { setList(load()); }, []);
  const save = (l: Meeting[]) => { setList(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { toast.error("Couldn't save — browser storage is full or blocked."); } };

  const create = () => {
    if (!title.trim()) { toast.error("Give the meeting a title."); return; }
    const room = `AlphaAI-${title.trim().replace(/[^a-z0-9]+/gi, "-").slice(0, 30)}-${crypto.randomUUID().slice(0, 8)}`;
    save([{ id: crypto.randomUUID(), title: title.trim(), when, kind, room }, ...list]);
    setTitle(""); setWhen("");
    toast.success("Meeting created. Share its link with participants.");
  };
  const link = (m: Meeting) => `https://meet.jit.si/${m.room}`;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link to="/" className="rounded-lg p-2 hover:bg-muted" aria-label="Back to chat"><ArrowLeft className="h-5 w-5" /></Link>
        <AlphaWordmark compact />
        <h1 className="ml-2 font-display text-lg font-semibold">Meetings</h1>
      </header>

      {active ? (
        <section className="flex h-[calc(100dvh-60px)] flex-col">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="font-semibold">{active.title}</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setActive(null)}>Leave</Button>
          </div>
          <iframe title={`Meeting: ${active.title}`} src={`${link(active)}#config.prejoinPageEnabled=true`}
            allow="camera; microphone; fullscreen; display-capture; autoplay" className="flex-1 border-0" />
        </section>
      ) : (
        <div className="mx-auto grid max-w-4xl gap-6 p-4 md:grid-cols-2">
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Schedule a meeting</h2>
            <label className="block text-sm">Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="S3 Biology study group"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
            <label className="block text-sm">Type
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2">
                <option>Student discussion</option><option>Teacher meeting</option><option>Class lesson</option><option>Parent meeting</option>
              </select></label>
            <label className="block text-sm">Date & time (optional)
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
            <Button variant="brand" className="w-full" onClick={create}>Create meeting</Button>
            <div className="border-t pt-3">
              <label className="block text-sm">Join with a link or room name
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="https://meet.jit.si/…"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
              <Button variant="outline" className="mt-2 w-full" onClick={() => {
                const room = joinCode.trim().replace(/^https?:\/\/meet\.jit\.si\//, "").replace(/[^A-Za-z0-9-_]/g, "");
                if (!room) { toast.error("Paste a meeting link first."); return; }
                setActive({ id: "join", title: room, when: "", kind: "", room });
              }}>Join</Button>
            </div>
            <p className="text-xs text-muted-foreground">Video calls run on the free Jitsi Meet service. Anyone with the link can join, so share it only with your group.</p>
          </section>
          <section className="space-y-2">
            <h2 className="font-semibold">Your meetings</h2>
            {list.length === 0 && <p className="text-sm text-muted-foreground">No meetings yet.</p>}
            {list.map((m) => (
              <div key={m.id} className="rounded-xl border bg-card p-3">
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.kind}{m.when ? ` · ${new Date(m.when).toLocaleString()}` : ""}</div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="brand" onClick={() => setActive(m)}><Video className="mr-1 h-4 w-4" />Join</Button>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(link(m)).then(() => toast.success("Link copied"), () => toast.error("Copy failed"))}>
                    <Copy className="mr-1 h-4 w-4" />Copy link</Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${m.title}`} onClick={() => save(list.filter((x) => x.id !== m.id))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
