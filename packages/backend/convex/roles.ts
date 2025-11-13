import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server.js";
import { Doc } from "./_generated/dataModel.js";

export type UserRole = "client" | "sales" | "admin";

/**
 * Get the current authenticated user from the database
 */
async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return user;
}

/**
 * Get the role of the current authenticated user
 * Returns null if user is not authenticated
 */
export async function getUserRole(
  ctx: QueryCtx | MutationCtx
): Promise<UserRole | null> {
  const user = await getCurrentUser(ctx);
  return user?.role || null;
}

/**
 * Require that the current user has one of the specified roles
 * Throws an error if the user is not authenticated or doesn't have the required role
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: UserRole[]
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new Error("Authentication required");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Unauthorized. Required role: ${allowedRoles.join(" or ")}, but user has role: ${user.role}`
    );
  }

  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  return requireRole(ctx, ["admin"]);
}

/**
 * Require admin or sales role
 */
export async function requireAdminOrSales(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  return requireRole(ctx, ["admin", "sales"]);
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(
  ctx: QueryCtx | MutationCtx,
  role: UserRole
): Promise<boolean> {
  const userRole = await getUserRole(ctx);
  return userRole === role;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  return hasRole(ctx, "admin");
}

/**
 * Check if the current user is sales or admin
 */
export async function isAdminOrSales(
  ctx: QueryCtx | MutationCtx
): Promise<boolean> {
  const userRole = await getUserRole(ctx);
  return userRole === "admin" || userRole === "sales";
}
