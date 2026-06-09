import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { platformNav } from "@/lib/platform-nav";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { PlatformMobileNav } from "@/components/platform/platform-nav";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requirePlatformAdmin();

  async function signOut() {
    "use server";
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent/20">
      <PlatformSidebar
        items={platformNav}
        userName={ctx.fullName ?? ctx.email}
        userEmail={ctx.email}
        signOut={signOut}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <PlatformMobileNav items={platformNav} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
