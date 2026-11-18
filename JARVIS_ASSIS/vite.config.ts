// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, Nitro, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: true,
  vite: {
    server: {
      allowedHosts: ["sb-5vo8alrbhws4.vercel.run"],
      proxy: {
        "/api": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
