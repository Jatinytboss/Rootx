import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Server middleware: rejects the call unless a valid bearer token is present. */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) throw new Response("Unauthorized", { status: 401 });

  const { verifyToken } = await import("./auth.server");
  const claims = await verifyToken(token);
  if (!claims) throw new Response("Unauthorized", { status: 401 });

  return next({
    context: { userId: claims.sub, email: claims.email, name: claims.name },
  });
});
