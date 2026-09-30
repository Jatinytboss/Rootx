// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * The MongoDB driver pulls in `tr46`, which does `require("punycode/")`.
 * The bundler's Node shim maps that to a file path with a trailing slash and
 * then fails to read it. We intercept the load and supply a tiny ESM module
 * backed by the real `punycode` package instead.
 */
const punycodeShim = {
  name: "punycode-load-fix",
  enforce: "pre" as const,
  load(id: string) {
    if (!/punycode\.mjs\/?$/.test(id)) return null;
    return [
      `import punycode from "punycode/punycode.js";`,
      `export const { ucs2, decode, encode, toASCII, toUnicode, version } = punycode;`,
      `export default punycode;`,
    ].join("\n");
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [punycodeShim],
  vite: {
    resolve: {
      alias: { "whatwg-url": new URL("./src/shims/whatwg-url.ts", import.meta.url).pathname },
    },
  },
});
