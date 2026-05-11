import { NextResponse } from "next/server";

import { searchCatalog } from "@/lib/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const results = await searchCatalog(q);
  return NextResponse.json(results);
}
