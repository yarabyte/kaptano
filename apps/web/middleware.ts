import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          error:
            "Supabase non configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env",
        },
        { status: 503 }
      );
    }
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem;max-width:600px;margin:auto">
        <h1>Configuration Supabase manquante</h1>
        <p>Ajoutez vos clés dans <code>.env</code> à la racine du projet :</p>
        <pre style="background:#f4f4f4;padding:1rem;border-radius:8px">NEXT_PUBLIC_SUPABASE_URL=https://eiyeeugkfvjkfabwyopt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...</pre>
        <p><a href="https://supabase.com/dashboard/project/eiyeeugkfvjkfabwyopt/settings/api">Ouvrir les paramètres API Supabase →</a></p>
        <p>Puis redémarrez <code>pnpm dev</code>.</p>
      </body></html>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
