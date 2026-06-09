import { redirect } from "next/navigation";
import type { UserRole } from "@kaptano/db";
import type { TenantContext } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "NO_TENANT"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getSessionUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    include: { tenant: true },
  });

  if (!dbUser || !dbUser.active) return null;

  return dbUser;
}

export async function requireAuth(): Promise<TenantContext> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "PLATFORM_ADMIN" && !user.tenantId) {
    throw new AuthError("Aucun tenant associé", "NO_TENANT");
  }

  return {
    tenantId: user.tenantId ?? "",
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
  };
}

export async function requireTenantContext(): Promise<
  TenantContext & { tenantId: string }
> {
  const ctx = await requireAuth();

  if (ctx.role === "PLATFORM_ADMIN") {
    throw new AuthError("Contexte tenant requis", "FORBIDDEN");
  }

  if (!ctx.tenantId) {
    throw new AuthError("Aucun tenant associé", "NO_TENANT");
  }

  return { ...ctx, tenantId: ctx.tenantId };
}

export async function requireRole(allowed: UserRole[]): Promise<TenantContext> {
  const ctx = await requireAuth();
  if (!allowed.includes(ctx.role as UserRole)) {
    redirect("/dashboard");
  }
  return ctx;
}

export async function requirePlatformAdmin(): Promise<TenantContext> {
  const ctx = await requireAuth();
  if (ctx.role !== "PLATFORM_ADMIN") {
    redirect("/dashboard");
  }
  return ctx;
}

export function tenantWhere(tenantId: string) {
  return { tenantId };
}
