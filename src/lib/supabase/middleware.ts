import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes reachable without a session. Everything else requires authentication.
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/auth", "/invite", "/supplier", "/customer", "/api/health"];
// Auth screens that a signed-in user should never be stuck on.
const AUTH_ONLY_PREFIXES = ["/login", "/register", "/forgot-password"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    // Not configured: nothing to authenticate against. Auth pages show a clear error.
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  // Validates the JWT with Supabase and refreshes the session cookies if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = matches(pathname, PUBLIC_PREFIXES);

  const redirectTo = (path: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search;
    const response = NextResponse.redirect(url);
    // Keep any refreshed auth cookies on the redirect response.
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  // Someone who is not signed in is sent to the login and brought back to where they were going afterwards.
  if (!user && !isPublic) {
    const wanted = pathname + request.nextUrl.search;
    return redirectTo("/login", wanted !== "/" && !pathname.startsWith("/api") ? `?next=${encodeURIComponent(wanted)}` : "");
  }
  if (user && (pathname === "/" || matches(pathname, AUTH_ONLY_PREFIXES))) return redirectTo("/dashboard");

  return supabaseResponse;
}
