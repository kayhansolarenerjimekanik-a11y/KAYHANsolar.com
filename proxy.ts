import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/session";

const ADMIN_PREFIX = "/kayhan-yonetim";
const LOGIN_PATH = "/kayhan-yonetim/giris";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate admin routes
  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next();
  }

  // Login page is always accessible
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  const session = await verifySession(token);
  if (!session || !["admin", "moderator", "assistant"].includes(session.role)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/kayhan-yonetim/:path*"],
};
