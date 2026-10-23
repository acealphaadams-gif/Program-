import { useState, type ReactNode } from "react";
import { Check, Copy, Download, Play, X } from "lucide-react";
import { toast } from "sonner";

const EXT: Record<string, string> = {
  python: "py", py: "py", javascript: "js", js: "js", typescript: "ts", ts: "ts", tsx: "tsx", jsx: "jsx", html: "html",
  css: "css", java: "java", c: "c", cpp: "cpp", "c++": "cpp", csharp: "cs", cs: "cs", go: "go", rust: "rs", php: "php",
  sql: "sql", kotlin: "kt", dart: "dart", bash: "sh", sh: "sh", json: "json", ruby: "rb", swift: "swift",
};
const RUNNABLE = new Set(["html", "javascript", "js"]);

function nodeText(n: ReactNode): string {
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(nodeText).join("");
  if (n && typeof n === "object" && "props" in n) return nodeText((n as { props: { children?: ReactNode } }).props.children);
  return "";
}

function sandboxDoc(lang: string, code: string) {
  if (lang === "html") return code;
  // JS: capture console output into the page. Runs in an opaque-origin sandbox (no access to the app).
  const safe = code.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><body style="font:13px ui-monospace,monospace;background:#0b1220;color:#e2e8f0;margin:0;padding:10px;white-space:pre-wrap"><script>
const out=(c,a)=>{const d=document.createElement('div');d.style.color=c;d.textContent=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ');document.body.appendChild(d)};
console.log=(...a)=>out('#e2e8f0',a);console.info=console.log;console.warn=(...a)=>out('#fbbf24',a);console.error=(...a)=>out('#f87171',a);
window.onerror=(m,s,l)=>{out('#f87171',['Error: '+m+' (line '+l+')'])};
</script><script>${safe}</script></body>`;
}

export function CodeBlock({ className, children }: { className?: string; children?: ReactNode }) {
  const lang = /language-([\w+#-]+)/.exec(className ?? "")?.[1]?.toLowerCase() ?? "";
  const code = nodeText(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Copy failed — clipboard blocked."); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = `alpha-code.${EXT[lang] ?? "txt"}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border bg-code">
      <div className="flex items-center gap-1 border-b bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{lang || "code"}</span>
        <div className="flex-1" />
        {RUNNABLE.has(lang) && (
          <button onClick={() => setRunning((r) => !r)} className={btn} aria-label={running ? "Close output" : "Run code"}>
            {running ? <X className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {running ? "Close" : "Run"}
          </button>
        )}
        <button onClick={download} className={btn} aria-label="Download code"><Download className="h-3.5 w-3.5" /></button>
        <button onClick={copy} className={btn} aria-label={copied ? "Copied" : "Copy code"}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-3 text-[13px] leading-relaxed"><code className={className}>{children}</code></pre>
      {running && (
        <iframe title="Code output" sandbox="allow-scripts allow-modals" srcDoc={sandboxDoc(lang, code)}
          className="h-64 w-full border-t bg-background" />
      )}
    </div>
  );
}

const btn = "flex items-center gap-1 rounded px-1.5 py-1 hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
