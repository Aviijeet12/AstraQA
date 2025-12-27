import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const runtime = "nodejs";

type SettingsPayload = {
  llmProvider?: string
  vectorDb?: string
  apiKeyMasked?: boolean
  defaultBrowser?: string
  implicitWaitSeconds?: number
  headless?: boolean
}

export async function POST(req: Request) {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const body = (await req.json().catch(() => ({}))) as SettingsPayload

  const saved = await prisma.userSettings.upsert({
    where: { userId },
    update: {
      llmProvider: body.llmProvider,
      vectorDb: body.vectorDb,
      browser: body.defaultBrowser,
      implicitWaitSeconds: typeof body.implicitWaitSeconds === "number" ? body.implicitWaitSeconds : null,
      headless: typeof body.headless === "boolean" ? body.headless : null,
    },
    create: {
      userId,
      llmProvider: body.llmProvider,
      vectorDb: body.vectorDb,
      browser: body.defaultBrowser,
      implicitWaitSeconds: typeof body.implicitWaitSeconds === "number" ? body.implicitWaitSeconds : null,
      headless: typeof body.headless === "boolean" ? body.headless : null,
    },
    select: {
      llmProvider: true,
      vectorDb: true,
      browser: true,
      implicitWaitSeconds: true,
      headless: true,
    },
  })

  return NextResponse.json({ status: "ok", settings: saved })
}
