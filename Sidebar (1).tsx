import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, Plus, Settings, Trash2, Pencil, Video, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlphaWordmark } from "./Logo";
import { deleteSession, listSessions, onSessionsChange, renameSession, type SessionMeta } from "@/lib/alpha/sessions";
import type { Profile } from "@/lib/alpha/profile";
import { cn } from "@/lib/utils";

export function Sidebar({
  activeId, profile, onNew, onOpenSettings, onNavigate, onDeletedActive,
}: {
  activeId: string;
  profile: Profile;
  onNew: () => void;
  onOpenSettings: () => void;
  onNavigate?: () => void;
  onDeletedActive: () => void;
}) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  useEffect(() => {
    const load = () => setSessions(listSessions());
    load();
    return onSessionsChange(load);
  }, []);

  return (
    <nav aria-label="Chat sessions" className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-4"><AlphaWordmark /></div>
      <div className="px-3">
        <Button variant="brand" className="w-full justify-start gap-2" onClick={onNew}>
          <Plus className="h-4 w-4" /> New chat
        </Button>
        <Link to="/meetings" onClick={onNavigate} className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
          <Video className="h-4 w-4" /> Meetings
        </Link>
        <Link to="/learning-workspace" onClick={onNavigate} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BookOpen className="h-4 w-4" /> Learning Workspace
        </Link>
      </div>
      <div className="mt-4 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Previous chats</div>
      <ul className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 && <li className="px-2 py-3 text-sm text-muted-foreground">No saved chats yet.</li>}
        {sessions.map((s) => (
          <li key={s.id} className={cn("group flex items-center rounded-lg", s.id === activeId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60")}>
            <Link to="/chat/$threadId" params={{ threadId: s.id }} onClick={onNavigate}
              aria-current={s.id === activeId ? "page" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{s.title}</span>
            </Link>
            <button className="rounded p-1.5 text-muted-foreground opacity-70 hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label={`Rename ${s.title}`}
              onClick={() => { const t = window.prompt("Rename chat", s.title); if (t?.trim()) renameSession(s.id, t.trim()); }}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button className="mr-1 rounded p-1.5 text-muted-foreground opacity-70 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label={`Delete ${s.title}`}
              onClick={() => { if (window.confirm("Delete this chat? This can't be undone.")) { deleteSession(s.id); if (s.id === activeId) onDeletedActive(); } }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-sidebar-border p-3">
        <button onClick={onOpenSettings} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-display font-bold text-primary-foreground" aria-hidden>
            {profile.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{profile.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{profile.role} · {profile.level}</span>
          </span>
          <Settings className="h-4 w-4 text-muted-foreground" aria-label="Preferences" />
        </button>
      </div>
    </nav>
  );
}
