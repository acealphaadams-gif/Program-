import { useState } from "react";
import { Download, ImagePlus, LoaderCircle, Sparkles, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const styles = [
  { label: "Educational illustration", value: "Educational illustration, clean labels and uncluttered composition" },
  { label: "Calm editorial", value: "Soft editorial illustration, calm sage and teal palette" },
  { label: "Photorealistic", value: "Photorealistic, natural lighting, carefully composed" },
  { label: "Friendly 3D", value: "Friendly 3D educational visual, soft lighting, rounded forms" },
  { label: "Flat infographic", value: "Minimal flat vector infographic, clear visual hierarchy" },
  { label: "Scientific diagram", value: "Accurate scientific educational diagram, clear labelled parts, uncluttered" },
];

export type GeneratedImageAsset = { dataUrl: string; filename: string; altText: string; prompt: string };
type ImageResult = { image: string; filename: string; mimeType?: string };

async function downloadDataUrl(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally { window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500); }
}

export function ImageStudioDialog({ open, onOpenChange, onUseInCanvas }: { open: boolean; onOpenChange: (open: boolean) => void; onUseInCanvas: (asset: GeneratedImageAsset) => void }) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(styles[0].value);
  const [size, setSize] = useState("1024x1024");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [revision, setRevision] = useState(0);

  const generate = async () => {
    if (prompt.trim().length < 4) { toast.error("Describe the image you want first."); return; }
    setBusy(true); setResult(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch("/api/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), style, size }), signal: controller.signal });
      const data = await response.json() as ImageResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Image generation failed.");
      if (!data.image?.startsWith("data:image/png;base64,")) throw new Error("The image service returned an unsupported image format.");
      setResult(data);
      setRevision((n) => n + 1);
      toast.success("Your image is ready to preview, download, or add to Canvas.");
    } catch (error) {
      toast.error(error instanceof Error && error.name === "AbortError" ? "Image generation took too long. Please try again." : error instanceof Error ? error.message : "Could not generate the image.");
    } finally { window.clearTimeout(timeout); setBusy(false); }
  };

  const addToCanvas = () => {
    if (!result) return;
    onUseInCanvas({ dataUrl: result.image, filename: result.filename, altText: prompt.trim().slice(0, 180), prompt: prompt.trim() });
    toast.success("The actual image has been attached to Canvas.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ImagePlus className="h-5 w-5 text-primary" /> Image Studio</DialogTitle>
          <DialogDescription>Create original study illustrations, diagrams, concept art, and visual learning aids. You can download the PNG or attach the real image to Canvas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><label htmlFor="image-prompt" className="text-sm font-medium">Describe what Alpha should create</label><textarea id="image-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={1600} rows={4} placeholder="Example: A clear, accurate plant-cell diagram for a Ugandan S2 biology learner, with the cell wall, nucleus, vacuole and chloroplasts easy to distinguish…" className="w-full resize-y rounded-xl border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><div className="text-right text-xs text-muted-foreground">{prompt.length}/1600</div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><label htmlFor="image-style" className="text-sm font-medium">Visual direction</label><select id="image-style" value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-xl border bg-card p-2.5 text-sm">{styles.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            <div className="space-y-1.5"><label htmlFor="image-size" className="text-sm font-medium">Image format</label><select id="image-size" value={size} onChange={(e) => setSize(e.target.value)} className="w-full rounded-xl border bg-card p-2.5 text-sm"><option value="1024x1024">Square — 1:1</option><option value="1536x1024">Landscape — 3:2</option><option value="1024x1536">Portrait — 2:3</option></select></div>
          </div>
          <Button onClick={generate} disabled={busy || prompt.trim().length < 4} className="w-full"><span className="flex items-center gap-2">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : result ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{busy ? "Creating your image…" : result ? "Generate another version" : "Generate image"}</span></Button>
          {busy && <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground" role="status" aria-live="polite">Alpha is creating your image. This can take a little while. Keep this window open while the request finishes.</div>}
          {result && <div key={revision} className="space-y-3 rounded-xl border bg-muted/20 p-3 sm:p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-medium">Your generated image</p><p className="text-xs text-muted-foreground">PNG · {size.replace("x", " × ")}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">Ready</span></div><img src={result.image} alt={`Generated image: ${prompt}`} className="mx-auto max-h-[48vh] w-full rounded-lg object-contain" /><div className="flex flex-wrap gap-2"><Button onClick={() => { void downloadDataUrl(result.image, result.filename).catch(() => toast.error("Could not download the image. Try again or use your browser’s save-image option.")); }}><Download className="mr-2 h-4 w-4" />Download PNG</Button><Button variant="outline" onClick={addToCanvas}><FileText className="mr-2 h-4 w-4" />Add image to Canvas</Button></div><p className="break-all text-xs text-muted-foreground">{result.filename}</p></div>}
          <p className="text-xs text-muted-foreground">Image generation requires an enabled OpenAI API model and may incur API charges. Generated images stay in this browser until you download them or save them in Canvas. Never put your API key in frontend code.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
