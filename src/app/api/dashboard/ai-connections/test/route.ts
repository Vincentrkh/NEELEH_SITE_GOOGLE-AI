import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getApiLang } from "@/lib/i18n";
import { testAiProviderById } from "@/lib/ai/connections";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const lang = await getApiLang();
  const body = (await req.json().catch(() => ({}))) as { providerId?: string };
  if (!body.providerId) {
    return NextResponse.json({ error: "providerId required" }, { status: 400 });
  }
  const result = await testAiProviderById(body.providerId, lang, admin.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
