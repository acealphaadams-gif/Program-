import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { Onboarding } from "@/components/alpha/Onboarding";
import { AlphaLogo } from "@/components/alpha/Logo";
import { useAlphaState, type Profile } from "@/lib/alpha/profile";
import { listSessions, newSessionId } from "@/lib/alpha/sessions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alpha AI — Your Friendly Tutor for Uganda" },
      { name: "description", content: "Step-by-step AI tutoring for Ugandan learners and teachers, aligned to NCDC and UNEB." },
      { property: "og:title", content: "Alpha AI — Your Friendly Tutor" },
      { property: "og:description", content: "Step-by-step AI tutoring for Ugandan learners and teachers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { ready, profile, setProfile } = useAlphaState();
  const navigate = useNavigate();

  // Returning users continue their most recent chat.
  useEffect(() => {
    if (!ready || !profile) return;
    const latest = listSessions()[0];
    navigate({ to: "/chat/$threadId", params: { threadId: latest?.id ?? newSessionId() }, replace: true });
  }, [ready, profile, navigate]);

  const done = useCallback(
    (p: Profile) => {
      setProfile(p); // the effect above performs the single navigation
    },
    [setProfile],
  );

  if (!ready || profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background" aria-busy="true">
        <AlphaLogo className="h-16 w-16 animate-pulse" />
        <span className="sr-only">Loading Alpha AI…</span>
      </main>
    );
  }
  return <Onboarding onDone={done} />;
}
