/**
 * lib/require-user.js
 *
 * Shared authentication guard for Server Actions.
 * Call `await requireUser()` as the FIRST line of any action that:
 *  - calls a paid AI model  (F-007)
 *  - reads or writes user data  (F-003, F-004)
 *
 * Returns the full Prisma user record on success.
 * Throws "Unauthorized" (→ 401) or "User not found" (→ 404) otherwise.
 */

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function requireUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");
  return user;
}
