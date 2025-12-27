import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const isPublicPath = (pathname: string) => {
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/public")) return true;
  if (pathname.startsWith("/styles")) return true;
  if (pathname.startsWith("/demo")) return true;
  if (pathname.startsWith("/how-it-works")) return true;
  return false;
};

const isAuthPage = (pathname: string) => pathname === "/login" || pathname === "/signup";

const isProtectedPath = (pathname: string) => {
  if (pathname === "/") return true; // first screen should be auth
  if (pathname.startsWith("/dashboard")) return true;

  // protect your main API routes (but not NextAuth itself)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) return true;

  return false;
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthed = Boolean((token as any)?.userId);

  // If user is logged in, keep them out of auth pages.
  if (isAuthed && isAuthPage(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // If user is not logged in, force them onto login for protected paths.
  if (!isAuthed && isProtectedPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // If user is logged in and hits '/', push to dashboard.
  if (isAuthed && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
