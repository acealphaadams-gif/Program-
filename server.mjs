// Netlify Function wrapper for Alpha AI (SSR + /api/*).
// Built server lives at dist/server after `npm run build`.

async function loadServer() {
  const candidates = [
    "../../dist/server/index.mjs",
    "../../dist/server/index.js",
    "../../.output/server/index.mjs",
    "../../.netlify/functions-internal/server/index.mjs",
  ];
  let lastErr;
  for (const p of candidates) {
    try {
      return await import(p);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Alpha server bundle not found. Check that npm run build produced dist/server.");
}

let serverPromise;

export default async (request, context) => {
  try {
    if (!serverPromise) serverPromise = loadServer();
    const mod = await serverPromise;
    const server = mod.default || mod;
    if (typeof server.fetch === "function") {
      return server.fetch(request, process.env, {
        waitUntil: (p) => context?.waitUntil?.(p),
        passThroughOnException() {},
      });
    }
    if (typeof server === "function") {
      return server(request, context);
    }
    return new Response("Alpha server loaded but has no fetch handler.", { status: 500 });
  } catch (err) {
    console.error("[alpha netlify function]", err);
    return new Response(
      JSON.stringify({
        error: "Alpha server failed to start",
        detail: String(err && err.message ? err.message : err),
        hint: "Ensure the site was built with npm run build and AI keys are set in Netlify env.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const config = {
  path: "/*",
  preferStatic: true,
};
