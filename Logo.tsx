import { useId } from "react";
import { cn } from "@/lib/utils";

/** Alpha α glyph (DejaVu Sans Bold outline) — same artwork as /logo.svg and the app icons. */
const ALPHA_PATH =
  "M38.03 21.18 38.89 18.6H46.31L41.69 32.41L42.34 36.07Q43.03 40.02 44.66 40.02H46.62V45.4H44.18Q40.37 45.4 38.44 43.39Q38.01 42.93 37.89 42.7Q36.74 44.16 35.6 45.1Q34.46 46.05 28.51 46Q22.57 45.95 19.98 42.34Q17.38 38.72 17.38 31.66Q17.38 24.63 20.08 21.76Q23.51 18.07 30.06 18Q35.59 17.93 38.03 21.18ZM34.73 31.31 34.01 27.41Q33.34 23.77 30.18 23.74Q28.58 23.74 27.25 25.81Q25.92 27.88 25.92 32.07Q25.92 36.28 27.12 38.17Q28.32 40.06 30.09 40.11Q31.95 40.16 33.1 36.5Z";

/**
 * Alpha AI logo: green ring with α on black. Self-contained black disc, so it reads
 * on both the dark and light themes. Each instance gets its own gradient ids — shared
 * ids break when the first copy sits inside a display:none element (e.g. the desktop
 * sidebar on a phone), which would leave every other logo blank.
 */
export function AlphaMark({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const green = `alpha-green-${uid}`;
  const shine = `alpha-shine-${uid}`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("select-none", className)}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Alpha AI"}
    >
      <defs>
        <linearGradient id={green} gradientUnits="userSpaceOnUse" x1="10" y1="8" x2="54" y2="56">
          <stop offset="0" stopColor="#86EFAC" />
          <stop offset="0.55" stopColor="#22C55E" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
        <radialGradient id={shine} gradientUnits="userSpaceOnUse" cx="32" cy="24" r="42">
          <stop offset="0" stopColor="#0F1A14" />
          <stop offset="0.6" stopColor="#050807" />
          <stop offset="1" stopColor="#000000" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#${shine})`} />
      <circle cx="32" cy="32" r="26.2" fill="none" stroke={`url(#${green})`} strokeWidth="3.4" />
      <path d={ALPHA_PATH} fill={`url(#${green})`} fillRule="evenodd" />
    </svg>
  );
}

/** @deprecated name kept for drop-in compatibility — same as AlphaMark */
export function AlphaLogo({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return <AlphaMark className={className} decorative={decorative} />;
}

export function AlphaWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <AlphaMark decorative className="h-9 w-9 shrink-0" />
      <div className="leading-tight">
        <div className="font-display text-lg font-bold text-brand">Alpha AI</div>
        {!compact && <div className="text-xs text-muted-foreground">Your Friendly Tutor</div>}
      </div>
    </div>
  );
}
