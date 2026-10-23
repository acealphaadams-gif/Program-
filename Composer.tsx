import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { FileUIPart } from "ai";
import { ArrowUp, Mic, MicOff, Paperclip, Square, X, FileWarning, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useDictation } from "@/lib/alpha/voice";
import { cn } from "@/lib/utils";

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv", "text/html", "application/json", "application/xml", "text/xml"];
const TEXT_EXT = /\.(txt|md|csv|tsv|json|xml|html?|rtf|log|ya?ml|py|js|ts|tsx|jsx|java|c|cpp|h|cs|php|rb|go|rs|kt|swift|sql|sh|css|tex)$/i;
const MAX_TEXT_CHARS = 400_000;

const STUDY_PROMPT = "Be my study coach for this document. First give a short friendly overview of what it covers and list its main sections/topics as a numbered learning path. Then teach ONLY section 1 in simple language with a relatable Ugandan example, and end with 2 quick check questions. Wait for my answers before moving to the next section. Keep it engaging, not boring.";

type Attachment =
  | { kind: "image"; name: string; part: FileUIPart }
  | { kind: "pdf"; name: string; part: FileUIPart }
  | { kind: "text"; name: string; content: string };

// Magic-byte check so a renamed file can't pretend to be an image.
async function sniffImage(file: File) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  if (hex.startsWith("89504e47")) return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("47494638")) return "image/gif";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "image/webp";
  return null;
}

function readAs(file: File, mode: "url" | "text") {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    if (mode === "url") r.readAsDataURL(file); else r.readAsText(file);
  });
}

export function Composer({
  busy, disabled, disabledReason, enterToSend, onSend, onStop,
}: {
  busy: boolean;
  disabled: boolean;
  disabledReason?: string | undefined;
  enterToSend: boolean;
  onSend: (text: string, files: FileUIPart[]) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const [att, setAtt] = useState<Attachment | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dict = useDictation((t) => setText((s) => (s ? s + " " : "") + t));

  useEffect(() => { if (!busy) ta.current?.focus(); }, [busy]);
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);

  const pick = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setStatus(`Checking ${file.name}…`);
    try {
      if (file.size > MAX_BYTES) throw new Error("File is larger than 4 MB.");
      if (file.size === 0) throw new Error("File is empty.");
      const lower = file.name.toLowerCase();
      if (IMAGE_TYPES.includes(file.type)) {
        const real = await sniffImage(file);
        if (!real) throw new Error("This doesn't look like a valid image.");
        const url = await readAs(file, "url");
        setAtt({ kind: "image", name: file.name, part: { type: "file", mediaType: real, url, filename: file.name.slice(0, 80) } });
      } else if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
        const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        if (String.fromCharCode(...head) !== "%PDF-") throw new Error("This doesn't look like a valid PDF.");
        const url = await readAs(file, "url");
        setAtt({ kind: "pdf", name: file.name, part: { type: "file", mediaType: "application/pdf", url: url.replace(/^data:[^;]*;/, "data:application/pdf;"), filename: file.name.slice(0, 80) } });
      } else if (lower.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        if (!value.trim()) throw new Error("No readable text found in this Word document.");
        setAtt({ kind: "text", name: file.name, content: value.slice(0, MAX_TEXT_CHARS) });
        if (value.length > MAX_TEXT_CHARS) toast.info("Long document: only the first 400,000 characters will be sent.");
      } else if (TEXT_TYPES.includes(file.type) || TEXT_EXT.test(file.name)) {
        const content = await readAs(file, "text");
        if (/\u0000/.test(content.slice(0, 2000))) throw new Error("This file isn't plain text.");
        setAtt({ kind: "text", name: file.name, content: content.slice(0, MAX_TEXT_CHARS) });
        if (content.length > MAX_TEXT_CHARS) toast.info("Long file: only the first 400,000 characters will be sent.");
      } else if (/\.(doc|ppt|pptx|xls|xlsx|odt)$/.test(lower)) {
        throw new Error("Save this file as PDF (File → Save as / Export → PDF) and upload that instead.");
      } else {
        throw new Error("Unsupported file. Use PDF, Word (.docx), images, or text/code files.");
      }
      setStatus(null);
    } catch (e) {
      setStatus(null);
      toast.error((e as Error).message || "Could not read that file.");
    }
  };

  const canSend = !disabled && !busy && (text.trim().length > 0 || !!att);
  const submit = (study = false) => {
    if (!canSend) return;
    let body = text.trim();
    if (study) body = body ? `${STUDY_PROMPT}\n\nMy note: ${body}` : STUDY_PROMPT;
    const files: FileUIPart[] = [];
    if (att?.kind === "image" || att?.kind === "pdf") {
      files.push(att.part);
      if (!body) body = att.kind === "pdf" ? "Please help me understand this document." : "Please help me with this image.";
    }
    if (att?.kind === "text") body = `${body || "Please help me with this file."}\n\n--- Attached file: ${att.name} ---\n${att.content}`;
    onSend(body, files);
    setText("");
    setAtt(null);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && enterToSend && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4 sm:pb-4" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      {disabled && disabledReason && (
        <p className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" role="alert">
          <FileWarning className="h-4 w-4 shrink-0 text-destructive" aria-hidden /> {disabledReason}
        </p>
      )}
      <div className="rounded-2xl border bg-card shadow-lg focus-within:ring-2 focus-within:ring-ring">
        {(att || status) && (
          <div className="flex items-center gap-2 border-b px-3 py-2 text-sm" aria-live="polite">
            {status ? <span className="text-muted-foreground">{status}</span> : att && (
              <>
                {att.kind === "image" && <img src={att.part.url} alt="" className="h-10 w-10 rounded object-cover" />}
                <span className="min-w-0 flex-1 truncate">{att.name} <span className="text-muted-foreground">· ready</span></span>
                {att.kind !== "image" && (
                  <button type="button" onClick={() => submit(true)} disabled={!canSend}
                    className="flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
                    title="Alpha will guide you through this document section by section with quick checks">
                    <GraduationCap className="h-3.5 w-3.5" /> Study this
                  </button>
                )}
                <button onClick={() => setAtt(null)} aria-label={`Remove ${att.name}`} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
              </>
            )}
          </div>
        )}
        <label htmlFor="alpha-input" className="sr-only">Message Alpha</label>
        <textarea
          id="alpha-input"
          ref={ta}
          rows={1}
          value={text}
          maxLength={8000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={disabled ? "Tutor unavailable" : "Ask a question, e.g. Solve 2x² − 5x + 3 = 0"}
          className="block max-h-[200px] w-full resize-none bg-transparent px-4 pt-3 text-base outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          <input ref={fileRef} type="file" className="hidden"
            onChange={(e) => pick(e.target.files?.[0])} aria-hidden tabIndex={-1} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || disabled}
            className={tool} aria-label="Attach a document or image" title="Attach PDF, Word, image, text or code file (max 4 MB)">
            <Paperclip className="h-5 w-5" />
          </button>
          <button type="button" onClick={dict.toggle} disabled={!dict.supported || busy || disabled}
            className={cn(tool, dict.listening && "bg-destructive/20 text-destructive")}
            aria-pressed={dict.listening}
            aria-label={dict.listening ? "Stop voice input" : "Start voice input"}
            title={dict.supported ? (dict.listening ? "Listening… tap to stop" : "Speak your question") : "Voice input isn't supported in this browser (try Chrome on Android)"}>
            {dict.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          {dict.error && <span className="text-xs text-destructive" role="alert">{dict.error}</span>}
          <div className="flex-1" />
          {busy ? (
            <button type="button" onClick={onStop} className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background" aria-label="Stop generating">
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button type="button" onClick={() => submit()} disabled={!canSend}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-primary-foreground transition disabled:opacity-40"
              aria-label="Send message">
              <ArrowUp className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Alpha can make mistakes. Check important facts with your teacher or official NCDC/UNEB sources.</p>
    </div>
  );
}

const tool = "rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
