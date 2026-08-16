// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Add Vite options here, including a dev proxy for /api to the auth server.
  vite: {
    // Enable tsconfig path resolution natively if you removed the plugin
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      proxy: {
        // Forward /api/* requests to the local auth server during development.
        // This keeps the same-origin context so cookies are sent and you avoid CORS/SameSite issues.
        '/api': {
          target: 'http://localhost:8081',
          changeOrigin: true,
          secure: false,
          // keep the path as-is, no rewrite
        },
      },
    },
  },
});
