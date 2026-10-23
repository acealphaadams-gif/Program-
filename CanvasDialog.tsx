import { useEffect, useRef, useState } from "react";
import { Download, FileText, Save, Trash2, PencilLine, Eye, Columns2, Image as ImageIcon, X, Sparkles, LoaderCircle, Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { GeneratedImageAsset } from "./ImageStudioDialog";

const KEY = "alpha_canvas_draft_v1";
const DB_NAME = "alpha-canvas-assets-v1";
const STORE_NAME = "documents";
const DEFAULT_DRAFT = "# Alpha Canvas\n\nUse this space to draft, organise, and refine your work with Alpha AI.\n\n- Write notes or a report\n- Paste an answer from the chat\n- Plan a lesson or project\n- Attach generated images and export a finished document\n";
type CanvasImage = GeneratedImageAsset & { id: string };
type SavedCanvas = { id: "main"; draft: string; images: CanvasImage[]; updatedAt: number };

function openCanvasDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) { reject(new Error("IndexedDB is not available.")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local Canvas storage."));
  });
}

async function readCanvas(): Promise<SavedCanvas | null> {
  const db = await openCanvasDb();
  try {
    return await new Promise<SavedCanvas | null>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get("main");
      request.onsuccess = () => resolve((request.result as SavedCanvas | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not read Canvas."));
    });
  } finally { db.close(); }
}

async function writeCanvas(value: SavedCanvas): Promise<void> {
  const db = await openCanvasDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save Canvas."));
      tx.onabort = () => reject(tx.error ?? new Error("Canvas save was cancelled."));
    });
  } finally { db.close(); }
}

function saveFile(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.rel = "noopener";
  document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function downloadImage(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a"); link.href = url; link.download = filename; link.rel = "noopener";
    document.body.appendChild(link); link.click(); link.remove();
  } finally { window.setTimeout(() => URL.revokeObjectURL(url), 1500); }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeBaseName(value: string) { return value.replace(/[^a-z0-9-_]/gi, "-").slice(0, 60) || "alpha-notes"; }

export function CanvasDialog({ open, onOpenChange, initialText, initialImage }: { open: boolean; onOpenChange: (open: boolean) => void; initialText?: string; initialImage?: GeneratedImageAsset }) {
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [images, setImages] = useState<CanvasImage[]>([]);
  const [filename, setFilename] = useState("alpha-notes");
  const [format, setFormat] = useState("md");
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("Saved locally");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAction, setAiAction] = useState("improve");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lastAppliedImage = useRef<string | null>(null);
  const lastAppliedText = useRef<string | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await readCanvas();
        if (cancelled) return;
        if (saved) { setDraft(saved.draft || DEFAULT_DRAFT); setImages(saved.images || []); }
        else {
          try { const localDraft = localStorage.getItem(KEY); if (localDraft) setDraft(localDraft); } catch { /* storage may be unavailable */ }
        }
      } catch {
        try { const localDraft = localStorage.getItem(KEY); if (localDraft) setDraft(localDraft); } catch { /* storage may be unavailable */ }
      } finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [open, loaded]);

  useEffect(() => {
    if (!open) { lastAppliedText.current = null; lastAppliedImage.current = null; return; }
    if (!loaded || !initialText?.trim() || lastAppliedText.current === initialText) return;
    setDraft((current) => `${current.trim()}\n\n---\n\n${initialText.trim()}\n`);
    lastAppliedText.current = initialText;
  }, [open, loaded, initialText]);

  useEffect(() => {
    if (!open) { lastAppliedImage.current = null; return; }
    if (!loaded || !initialImage) return;
    const imageKey = `${initialImage.filename}:${initialImage.prompt}`;
    if (lastAppliedImage.current === imageKey) return;
    const newImage: CanvasImage = { ...initialImage, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    setImages((current) => current.some((image) => image.filename === newImage.filename && image.prompt === newImage.prompt) ? current : [...current, newImage]);
    setDraft((current) => `${current.trim()}\n\n## Generated image\n\n**Prompt:** ${initialImage.prompt}\n\n`);
    lastAppliedImage.current = imageKey;
    setViewMode("preview");
  }, [open, loaded, initialImage]);

  useEffect(() => {
    if (!open || !loaded) return;
    setAutoSaveStatus("Unsaved changes");
    const timer = window.setTimeout(() => {
      void writeCanvas({ id: "main", draft, images, updatedAt: Date.now() })
        .then(() => { try { localStorage.setItem(KEY, draft); } catch { /* IndexedDB remains the primary store */ } setAutoSaveStatus("Auto-saved on this device"); })
        .catch(() => { try { localStorage.setItem(KEY, draft); setAutoSaveStatus("Text auto-saved; image backup needs download"); } catch { setAutoSaveStatus("Not saved — download a copy"); } });
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [draft, images, open, loaded]);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await writeCanvas({ id: "main", draft, images, updatedAt: Date.now() });
      try { localStorage.setItem(KEY, draft); } catch { /* IndexedDB is the primary store */ }
      toast.success(`Canvas saved on this device${images.length ? ` with ${images.length} image${images.length === 1 ? "" : "s"}` : ""}.`);
    } catch {
      try {
        localStorage.setItem(KEY, draft);
        setAutoSaveStatus("Text saved; image backup needs download");
        toast.warning("Text saved, but image storage is unavailable. Download the image and document to keep a complete copy.");
      } catch { setAutoSaveStatus("Not saved — download a copy"); toast.error("Browser storage is unavailable. Download your work to keep a copy."); }
    } finally { setSaving(false); }
  };

  const exportDraft = () => {
    const base = safeBaseName(filename);
    const escapedTitle = escapeHtml(filename);
    const ext = format === "html" ? "html" : format === "txt" ? "txt" : "md";
    const mime = format === "html" ? "text/html;charset=utf-8" : format === "txt" ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8";
    let content = draft;
    if (format === "html") {
      const imageHtml = images.map((image) => `<figure style="margin:24px 0"><img src="${image.dataUrl}" alt="${escapeHtml(image.altText || image.prompt)}" style="display:block;max-width:100%;height:auto;border-radius:12px"><figcaption style="color:#64748b;font-size:13px;margin-top:8px">${escapeHtml(image.filename)} — ${escapeHtml(image.prompt)}</figcaption></figure>`).join("\n");
      content = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapedTitle}</title><style>body{font:16px/1.7 system-ui,sans-serif;color:#20352f;max-width:900px;margin:3rem auto;padding:0 1.25rem;white-space:pre-wrap}h1,h2,h3{line-height:1.25;color:#234e43}</style></head><body><h1>${escapedTitle}</h1><main>${escapeHtml(draft).replace(/\n/g, "<br>\n")}\n${imageHtml}</main></body></html>`;
    } else if (format === "md" && images.length) {
      content += "\n\n## Attached images\n\n" + images.map((image) => `![${(image.altText || image.prompt).replace(/[\[\]]/g, "")}](<${image.dataUrl}>)\n\n*${image.filename}*`).join("\n\n");
    } else if (format === "txt" && images.length) {
      content += "\n\nAttached images:\n" + images.map((image) => `- ${image.filename}: ${image.prompt}`).join("\n");
    }
    saveFile(content, `${base}.${ext}`, mime);
    toast.success(format === "html" && images.length ? "HTML document downloaded with embedded images." : "Download started.");
  };

  const removeImage = (id: string) => setImages((current) => current.filter((image) => image.id !== id));


  const askAlpha = async () => {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? 0;
    const end = editor?.selectionEnd ?? 0;
    const selected = editor && end > start ? editor.value.slice(start, end).trim() : "";
    const source = selected || draft.trim();
    if (source.length < 2) { toast.error("Write something in Canvas first."); return; }
    setSelectionRange(selected ? { start, end } : null);
    setAiBusy(true); setAiSuggestion("");
    try {
      const response = await fetch("/api/canvas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: aiAction, text: source }) });
      const data = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Canvas AI action failed.");
      if (!data.text?.trim()) throw new Error("Alpha returned an empty suggestion. Please try again.");
      setAiSuggestion(data.text.trim());
      setViewMode("preview");
      toast.success(selected ? "Alpha has prepared a suggestion for your selected text." : "Alpha has prepared a suggestion for your draft.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Canvas AI action failed."); }
    finally { setAiBusy(false); }
  };

  const applySuggestion = () => {
    if (!aiSuggestion) return;
    if (selectionRange) setDraft((current) => `${current.slice(0, selectionRange.start)}${aiSuggestion}${current.slice(selectionRange.end)}`);
    else setDraft(aiSuggestion);
    setAiSuggestion(""); setSelectionRange(null); setViewMode("edit");
    toast.success("Suggestion applied to your Canvas draft.");
  };

  const insertSuggestion = () => {
    if (!aiSuggestion) return;
    setDraft((current) => `${current.trim()}\n\n---\n\n## Alpha suggestion\n\n${aiSuggestion}\n`);
    setAiSuggestion(""); setSelectionRange(null); setViewMode("edit");
    toast.success("Suggestion inserted below your draft.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-3 overflow-hidden sm:w-full">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Alpha Canvas</DialogTitle><DialogDescription>A calm workspace for writing, previewing, and exporting learning materials. Generated images can be attached and embedded in HTML exports. Saved drafts stay on this device.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-2"><input aria-label="File name" value={filename} onChange={(e) => setFilename(e.target.value)} className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2 text-sm" placeholder="File name" /><select aria-label="Export format" value={format} onChange={(e) => setFormat(e.target.value)} className="rounded-lg border bg-card px-3 py-2 text-sm"><option value="md">Markdown (.md)</option><option value="txt">Plain text (.txt)</option><option value="html">HTML (.html, images embedded)</option></select></div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/25 p-2.5">
          <div className="min-w-0 flex-1"><label htmlFor="canvas-ai-action" className="mb-1 block text-xs font-medium text-muted-foreground">Ask Alpha to help</label><select id="canvas-ai-action" value={aiAction} onChange={(e) => setAiAction(e.target.value)} className="w-full rounded-lg border bg-card px-2.5 py-2 text-sm"><option value="improve">Improve writing</option><option value="proofread">Proofread</option><option value="simplify">Make it easier to understand</option><option value="expand">Expand with explanation</option><option value="summarize">Summarize</option><option value="outline">Organize into an outline</option><option value="tutor_feedback">Give tutor feedback</option></select></div>
          <Button onClick={askAlpha} disabled={aiBusy || draft.trim().length < 2} className="mt-5 shrink-0">{aiBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{aiBusy ? "Working…" : "Ask Alpha"}</Button>
          <p className="w-full text-xs text-muted-foreground">Select text in the editor to work on only that passage, or leave it unselected to use the full draft. Your original stays unchanged until you apply a suggestion.</p>
        </div>
        {aiSuggestion && <section className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-3" aria-live="polite"><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" />Alpha's suggestion</h3><button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Copy suggestion" onClick={async () => { try { await navigator.clipboard.writeText(aiSuggestion); toast.success("Suggestion copied."); } catch { toast.error("Clipboard access is unavailable."); } }}><Copy className="h-4 w-4" /></button></div><div className="max-h-52 overflow-auto rounded-lg bg-card p-3 text-sm"><div className="alpha-prose"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore", trust: false }]]}>{aiSuggestion}</ReactMarkdown></div></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={applySuggestion}><Check className="mr-1.5 h-4 w-4" />{selectionRange ? "Replace selected text" : "Replace draft"}</Button><Button size="sm" variant="outline" onClick={insertSuggestion}>Insert below draft</Button><Button size="sm" variant="ghost" onClick={() => { setAiSuggestion(""); setSelectionRange(null); }}>Discard</Button></div></section>}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Canvas view mode">
          <button type="button" onClick={() => setViewMode("edit")} aria-pressed={viewMode === "edit"} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${viewMode === "edit" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><PencilLine className="h-3.5 w-3.5" />Editor</button>
          <button type="button" onClick={() => setViewMode("preview")} aria-pressed={viewMode === "preview"} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${viewMode === "preview" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Eye className="h-3.5 w-3.5" />Preview</button>
          <button type="button" onClick={() => setViewMode("split")} aria-pressed={viewMode === "split"} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${viewMode === "split" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Columns2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Split view</span><span className="sm:hidden">Split</span></button>
        </div>
        <div className={`grid min-h-0 flex-1 gap-3 overflow-y-auto ${viewMode === "split" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {viewMode !== "preview" && <textarea ref={editorRef} aria-label="Canvas document editor" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck className="min-h-[32vh] w-full resize-y rounded-xl border bg-card p-4 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-ring sm:min-h-[44vh]" />}
          {viewMode !== "edit" && <div className="min-h-[32vh] overflow-auto rounded-xl border bg-card p-4 sm:min-h-[44vh]"><div className="alpha-prose"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore", trust: false }]]} urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : "")}>{draft}</ReactMarkdown></div>{images.length > 0 && <div className="mt-5 space-y-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4" /> Attached images ({images.length})</h3>{images.map((image) => <figure key={image.id} className="overflow-hidden rounded-xl border bg-muted/20"><img src={image.dataUrl} alt={image.altText || image.prompt} className="max-h-[45vh] w-full object-contain" /><figcaption className="flex flex-wrap items-center gap-2 p-3"><span className="min-w-0 flex-1 text-xs text-muted-foreground">{image.filename}<br />{image.prompt}</span><Button size="sm" variant="outline" onClick={() => { void downloadImage(image.dataUrl, image.filename).catch(() => toast.error("Could not download this image. Please try again.")); }}><Download className="mr-1.5 h-3.5 w-3.5" />PNG</Button><Button size="icon" variant="ghost" onClick={() => removeImage(image.id)} aria-label={`Remove ${image.filename}`} title="Remove image"><X className="h-4 w-4" /></Button></figcaption></figure>)}</div>}</div>}
        </div>
        {viewMode === "edit" && images.length > 0 && <div className="max-h-28 overflow-y-auto rounded-lg border bg-muted/20 p-2"><p className="mb-2 flex items-center gap-2 text-xs font-medium"><ImageIcon className="h-3.5 w-3.5" />Attached images ({images.length}) — included in HTML export</p><div className="flex flex-wrap gap-2">{images.map((image) => <div key={image.id} className="flex items-center gap-2 rounded-md border bg-card p-1.5"><img src={image.dataUrl} alt="" className="h-10 w-10 rounded object-cover" /><span className="max-w-36 truncate text-xs">{image.filename}</span><button onClick={() => removeImage(image.id)} aria-label={`Remove ${image.filename}`} className="rounded p-1 hover:bg-muted"><X className="h-3.5 w-3.5" /></button></div>)}</div></div>}
        <div className="flex flex-wrap items-center gap-2"><span className="mr-auto text-xs text-muted-foreground">{draft.length.toLocaleString()} characters · {images.length} image{images.length === 1 ? "" : "s"} · {autoSaveStatus}</span><Button variant="outline" onClick={() => { setDraft(DEFAULT_DRAFT); setImages([]); toast("Canvas reset to its starter document."); }}><Trash2 className="mr-2 h-4 w-4" />Reset</Button><Button variant="outline" onClick={saveDraft} disabled={saving}>{saving ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Save className="mr-2 h-4 w-4" />}{saving ? "Saving…" : "Save draft"}</Button><Button onClick={exportDraft}><Download className="mr-2 h-4 w-4" />Download file</Button></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
