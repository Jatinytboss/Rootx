/**
 * Minimal stand-in for the `whatwg-url` package.
 *
 * The MongoDB driver only uses `URL` / `URLSearchParams` from it, and the real
 * package drags in `tr46` + `punycode`, which the edge bundler cannot load.
 * Both classes are standard globals in Node 18+ and in edge runtimes.
 */
export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;
export default { URL, URLSearchParams };
