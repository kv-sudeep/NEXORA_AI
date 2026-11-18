import { createFileRoute } from "@tanstack/react-router";
import { VideoStudio } from "@/components/jarvis/VideoStudio";

export const Route = createFileRoute("/video-studio")({
  component: VideoStudio,
  head: () => ({
    meta: [
      { title: "NEXORA AI — Video Studio & Automation" },
      { name: "description", content: "AI-powered professional multitrack video editing, lossless processing, and automation studio." },
    ],
  }),
});