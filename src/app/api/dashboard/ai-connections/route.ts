import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import {
  ensureAiDefaults,
  listAiProvidersAndSections,
} from "@/lib/ai/connections";
import {
  encryptSecret,
  maskSecret,
  validateExternalHttpsUrl,
} from "@/lib/crypto-vault";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requirePermission("setting.manage");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  const [{ providers, sections }, recentUsage] = await Promise.all([
    listAiProvidersAndSections(),
    db.aIUsageLedger.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        feature: true,
        provider: true,
        model: true,
        status: true,
        latencyMs: true,
        errorCode: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    providers,
    sections,
    recentUsage: recentUsage.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: await apiMsg("فقط مدیر کل مجاز است", "Admin access required") },
      { status: 403 },
    );
  }

  let body: {
    id?: string;
    name?: string;
    nameEn?: string;
    providerType?: string;
    baseUrl?: string;
    defaultModel?: string;
    apiKey?: string;
    enabled?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: await apiMsg("درخواست نامعتبر است", "Invalid JSON body") },
      { status: 400 },
    );
  }

  await ensureAiDefaults();

  const providerType = ["GEMINI_ENV", "OPENAI_COMPAT", "OLLAMA_LOCAL", "CUSTOM_REST"].includes(
    body.providerType ?? "",
  )
    ? String(body.providerType)
    : "OPENAI_COMPAT";

  const name = (body.name ?? "").trim();
  const defaultModel = (body.defaultModel ?? "").trim();
  if (!name || !defaultModel) {
    return NextResponse.json(
      { error: await apiMsg("نام سرویس‌دهنده و مدل پیش‌فرض الزامی است", "Provider name and model are required") },
      { status: 400 },
    );
  }

  let normalizedBaseUrl: string | null = null;
  if (providerType !== "GEMINI_ENV") {
    const rawBase =
      (body.baseUrl ?? "").trim() ||
      (providerType === "OLLAMA_LOCAL" ? "http://127.0.0.1:11434/v1" : "https://api.openai.com/v1");
    const check = validateExternalHttpsUrl(rawBase, {
      allowOllamaLoopback: providerType === "OLLAMA_LOCAL",
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    normalizedBaseUrl = check.normalized;
  }

  const rawSecret = (body.apiKey ?? "").trim();

  if (body.id) {
    const existing = await db.aIProviderConnection.findUnique({ where: { id: body.id } });
    if (!existing) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    const updateData: {
      name: string;
      nameEn?: string | null;
      baseUrl?: string | null;
      defaultModel: string;
      enabled: boolean;
      encryptedKey?: string | null;
      keyHint?: string | null;
    } = {
      name,
      nameEn: (body.nameEn ?? "").trim() || null,
      baseUrl: existing.providerType === "GEMINI_ENV" ? null : normalizedBaseUrl,
      defaultModel,
      enabled: body.enabled ?? true,
    };

    if (existing.providerType !== "GEMINI_ENV" && rawSecret) {
      updateData.encryptedKey = encryptSecret(rawSecret);
      updateData.keyHint = maskSecret(rawSecret);
    }

    await db.aIProviderConnection.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    if (providerType === "GEMINI_ENV") {
      return NextResponse.json(
        { error: await apiMsg("درگاه رسمی Gemini به صورت خودکار متصل است", "Server Gemini gateway already exists") },
        { status: 400 },
      );
    }
    const slugKey =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 24) || "custom";
    const uniqueKey = `${slugKey}-${Date.now().toString(36).slice(-4)}`;

    await db.aIProviderConnection.create({
      data: {
        key: uniqueKey,
        name,
        nameEn: (body.nameEn ?? "").trim() || null,
        providerType,
        baseUrl: normalizedBaseUrl,
        defaultModel,
        encryptedKey: rawSecret ? encryptSecret(rawSecret) : null,
        keyHint: rawSecret ? maskSecret(rawSecret) : null,
        enabled: body.enabled ?? true,
        lastStatus: "UNTESTED",
      },
    });
  }

  const data = await listAiProvidersAndSections();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: await apiMsg("فقط مدیر کل مجاز است", "Admin access required") },
      { status: 403 },
    );
  }

  let body: {
    sectionKey?: string;
    providerId?: string | null;
    modelOverride?: string | null;
    systemPrompt?: string | null;
    enabled?: boolean;
    requireConsent?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.sectionKey) {
    return NextResponse.json({ error: "sectionKey required" }, { status: 400 });
  }

  await ensureAiDefaults();

  if (body.providerId) {
    const p = await db.aIProviderConnection.findUnique({ where: { id: body.providerId } });
    if (!p) {
      return NextResponse.json({ error: "Selected AI provider not found" }, { status: 404 });
    }
  }

  await db.aISectionBinding.update({
    where: { sectionKey: body.sectionKey },
    data: {
      providerId: body.providerId ?? null,
      modelOverride: (body.modelOverride ?? "").trim() || null,
      systemPrompt: (body.systemPrompt ?? "").trim() || null,
      enabled: body.enabled ?? true,
      requireConsent: body.requireConsent ?? false,
    },
  });

  const data = await listAiProvidersAndSections();
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const target = await db.aIProviderConnection.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.key === "gemini-server") {
    return NextResponse.json(
      { error: await apiMsg("درگاه اصلی Gemini قابل حذف نیست", "Built-in Gemini connection cannot be deleted") },
      { status: 400 },
    );
  }

  await db.aIProviderConnection.delete({ where: { id } });
  const data = await listAiProvidersAndSections();
  return NextResponse.json(data);
}
