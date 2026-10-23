import { useEffect, useState } from "react";
import { Bell, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type Notice,
  fetchOfficialNotices,
  loadRead,
  saveRead,
  OFFICIAL_LINKS,
} from "@/lib/alpha/updates";

export function Notifications() {
  const [read, setRead] = useState<string[]>([]);
  const [items, setItems] = useState<Notice[]>(OFFICIAL_LINKS);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchOfficialNotices();
      setItems(list);
      setSource(list.some((n) => n.source === "UNEB" && n.date) ? "Live from uneb.ac.ug" : "Official education links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRead(loadRead());
    void load();
  }, []);

  const unread = items.filter((n) => !read.includes(n.id)).length;

  return (
    <Popover
      onOpenChange={(o) => {
        if (o) {
          const all = items.map((n) => n.id);
          setRead(all);
          saveRead(all);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative rounded-lg p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={unread ? `Updates, ${unread} unread` : "Updates"}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-h-[70vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display font-semibold">Education updates</h2>
            <p className="text-xs text-muted-foreground">
              {source || "Sourced from official UNEB / NCDC / MoES websites"}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Refresh notices"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
        <ul className="mt-3 space-y-3">
          {items.map((n) => (
            <li key={n.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {n.source && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {n.source}
                  </span>
                )}
                {n.date && <span className="text-[10px] text-muted-foreground">{n.date}</span>}
              </div>
              <div className="mt-1 text-sm font-semibold leading-snug">{n.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
              {n.link && (
                <a
                  href={n.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
                >
                  {n.link.label} <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Alpha links to official pages only. Always confirm dates and fees on the source website.
        </p>
      </PopoverContent>
    </Popover>
  );
}
