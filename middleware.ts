import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedRoutes = [
  "/dashboard",
  "/attendance",
  "/transport",
  "/alerts",
  "/issues",
  "/navigation",
  "/admin",
];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const hasAuthCookie =
    request.cookies.has("sb-access-token") ||
    request.cookies.getAll().some((cookie) => cookie.name.includes("auth-token"));

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && hasAuthCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
