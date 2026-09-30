import { createMiddleware } from "@tanstack/react-start";
import { getToken } from "./auth-client";

/**
 * Registered as a global `functionMiddleware` in `src/start.ts` so the browser
 * attaches the stored JWT to every server-function call.
 */
export const attachAuthToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = getToken();
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
