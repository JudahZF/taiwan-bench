import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { adminEnv } from "./env.ts";

export async function isAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email || identity.emailVerified === false) return false;
  return adminEnv().ADMIN_EMAILS.includes(identity.email.toLowerCase());
}

export async function requireAdmin(ctx: QueryCtx) {
  if (!(await isAdmin(ctx))) throw new ConvexError("Only admins can start or cancel runs.");
}
