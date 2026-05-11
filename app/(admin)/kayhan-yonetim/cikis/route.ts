import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(
    new URL("/kayhan-yonetim/giris", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  );
}
