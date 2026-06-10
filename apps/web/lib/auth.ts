import { cache } from "react";
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

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Connexion base de données indisponible");
    this.name = "DatabaseUnavailableError";
  }
}

export const getSessionUser = cache(async () => {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            planTier: true,
            subscriptionStatus: true,
            subscriptionExpiresAt: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.active) return null;

    return dbUser;
  } catch (error) {
    console.error("[auth] Échec lecture utilisateur:", error);
    throw new DatabaseUnavailableError();
  }
});

export async function requireAuth(): Promise<TenantContext> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "PLATFORM_ADMIN" && !user.tenantId) {
    redirect("/login?error=no_tenant");
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
