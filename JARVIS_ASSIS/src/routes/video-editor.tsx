import { createFileRoute } from "@tanstack/react-router";
import { VideoEditor } from "@/components/jarvis/VideoEditor";
import { Background } from "@/components/jarvis/Background";
import { BottomNav } from "@/components/jarvis/BottomNav";

export const Route = createFileRoute("/video-editor")({
  component: VideoPageRoute,
  head: () => ({
    meta: [
      { title: "JARVIS — Video Editing Studio" },
      { name: "description", content: "AI-powered video editing tools for JARVIS assistant." },
    ],
  }),
});

function VideoPageRoute() {
  return (
    <>
      <Background />
      <main className="relative h-screen w-screen overflow-hidden p-4">
        <header className="mb-4">
          <div className="font-display text-sm tracking-[0.3em] text-hud-cyan">
            ◣ VIDEO EDITING STUDIO · JARVIS 2.0 ◢
          </div>
        </header>

        <VideoEditor />

        <footer className="absolute inset-x-4 bottom-4">
          <BottomNav />
        </footer>
      </main>
    </>
  );
}