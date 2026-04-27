import { NextResponse } from "next/server";

function expireCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
}

export async function POST() {
  const res = NextResponse.json({ success: true });
  expireCookie(res, "next-auth.session-token");
  expireCookie(res, "__Secure-next-auth.session-token");
  expireCookie(res, "next-auth.csrf-token");
  expireCookie(res, "__Host-next-auth.csrf-token");
  expireCookie(res, "next-auth.callback-url");
  return res;
}

