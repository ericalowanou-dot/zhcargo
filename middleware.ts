import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.NEXTAUTH_SECRET;
  const token = secret
    ? await getToken({ req: request, secret })
    : null;

  if (pathname.startsWith("/admin/login")) {
    if (token && "isAdmin" in token && token.isAdmin) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!token || !("isAdmin" in token) || !token.isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/boutique/commandes") ||
    pathname.startsWith("/boutique/profil") ||
    pathname.startsWith("/boutique/checkout")
  ) {
    const isClient = token?.clientId;
    const isAdmin = "isAdmin" in (token || {}) && (token as { isAdmin?: boolean }).isAdmin;
    if (!isClient && !isAdmin) {
      const login = new URL("/auth/login", request.url);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/boutique/commandes/:path*",
    "/boutique/profil/:path*",
    "/boutique/checkout",
    "/boutique/checkout/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
