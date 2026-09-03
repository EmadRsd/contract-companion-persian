// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { createRequire } from "node:module";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const require = createRequire(import.meta.url);
const punycodePath = require.resolve("punycode/punycode.js");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        // The MongoDB driver pulls in `tr46`, which uses the legacy `require("punycode/")`
        // specifier. The trailing slash cannot be resolved by the worker bundler, so rewrite
        // it to the real userland package before bundling.
        name: "fix-tr46-punycode",
        enforce: "pre" as const,
        transform(code: string, id: string) {
          if (!id.includes("tr46") || !code.includes('require("punycode/")')) return null;
          return {
            code: code.replace(
              'require("punycode/")',
              `require(${JSON.stringify(punycodePath)})`,
            ),
            map: null,
          };
        },
      },
    ],
  },
});
