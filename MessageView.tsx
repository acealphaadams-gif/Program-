import type { UIMessage } from "ai";
import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, Copy, Download, FileText, ImageOff, Volume2, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { AlphaLogo } from "./Logo";
import { speak, speechSupported } from "@/lib/alpha/voice";
import { cn } from "@/lib/utils";

export function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

// Safe rendering: react-markdown does not render raw HTML (no rehype-raw), and links are restricted.
const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="alpha-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore", trust: false }]]}
        urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : "")}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>
          ),
          img: () => null,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});

export function MessageView({ message, streaming, onSaveToCanvas }: { message: UIMessage; streaming?: boolean; onSaveToCanvas?: (text: string) => void }) {
  const [copied, setCopied] = useState(false);
  const text = textOf(message);
  const files = message.parts.filter((p) => p.type === "file");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — your browser blocked clipboard access.");
    }
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-2 rounded-2xl rounded-br-md bg-user-bubble px-4 py-2.5 text-user-bubble-foreground">
          {files.map((f, i) =>
            f.type === "file" && f.mediaType === "application/pdf" ? (
              <div key={i} className="flex items-center gap-2 text-xs opacity-90"><FileText className="h-4 w-4" aria-hidden /> {f.filename ?? "Document.pdf"}</div>
            ) : f.type === "file" && f.url ? (
              <img key={i} src={f.url} alt={f.filename ?? "Attached image"} className="max-h-60 rounded-lg" />
            ) : (
              <div key={i} className="flex items-center gap-2 text-xs opacity-80"><ImageOff className="h-4 w-4" aria-hidden /> File not kept in history</div>
            ),
          )}
          {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <AlphaLogo decorative className="mt-1 h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        {text ? <Markdown text={text} /> : null}
        {!streaming && text && (
          <div className="mt-2 flex gap-1 text-muted-foreground">
            <button onClick={copy} className={iconBtn} aria-label={copied ? "Copied" : "Copy answer"}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={() => {
              const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a"); link.href = url; link.download = "alpha-answer.md";
              document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
            }} className={iconBtn} aria-label="Download answer as Markdown" title="Download answer">
              <Download className="h-4 w-4" />
            </button>
            {onSaveToCanvas && <button onClick={() => onSaveToCanvas(text)} className={iconBtn} aria-label="Open answer in Canvas" title="Open answer in Canvas"><PencilLine className="h-4 w-4" /></button>}
            <button
              onClick={() => speak(text)}
              disabled={!speechSupported()}
              title={speechSupported() ? "Read aloud" : "Read-aloud isn't supported in this browser"}
              className={iconBtn}
              aria-label="Read answer aloud"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn = cn(
  "rounded-md p-1.5 transition hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" role="status" aria-label="Alpha is thinking">
      <AlphaLogo decorative className="h-8 w-8" />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-primary animate-alpha-dot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
