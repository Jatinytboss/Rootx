import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const signUpSchema = credentials.extend({
  fullName: z.string().trim().min(1, "Name is required").max(80),
});

export type AuthResult = {
  token: string;
  user: { id: string; email: string; name: string };
};

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signUpSchema.parse(input))
  .handler(async ({ data }): Promise<AuthResult> => {
    const { collections, ObjectId } = await import("./mongo.server");
    const { hashPassword, signToken } = await import("./auth.server");
    const { users } = await collections();

    const existing = await users.findOne({ email: data.email });
    if (existing) throw new Error("An account with this email already exists.");

    const _id = new ObjectId();
    await users.insertOne({
      _id,
      email: data.email,
      full_name: data.fullName,
      password_hash: await hashPassword(data.password),
      created_at: new Date(),
    });

    const user = { id: _id.toHexString(), email: data.email, name: data.fullName };
    return { token: await signToken({ sub: user.id, email: user.email, name: user.name }), user };
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => credentials.parse(input))
  .handler(async ({ data }): Promise<AuthResult> => {
    const { collections } = await import("./mongo.server");
    const { verifyPassword, signToken } = await import("./auth.server");
    const { users } = await collections();

    const found = await users.findOne({ email: data.email });
    if (!found || !(await verifyPassword(data.password, found.password_hash))) {
      throw new Error("Invalid email or password.");
    }

    const user = {
      id: found._id.toHexString(),
      email: found.email,
      name: found.full_name,
    };
    return { token: await signToken({ sub: user.id, email: user.email, name: user.name }), user };
  });

export const me = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => ({
    id: context.userId,
    email: context.email,
    name: context.name,
  }));
