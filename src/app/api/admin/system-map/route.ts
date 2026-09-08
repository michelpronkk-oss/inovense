import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/lib/admin/auth";
import { getSystemMapLiveData } from "@/lib/admin/system-map-live";

export async function GET() {
  await requireInternalAdmin();
  return NextResponse.json(await getSystemMapLiveData(), { headers: { "Cache-Control": "no-store" } });
}
