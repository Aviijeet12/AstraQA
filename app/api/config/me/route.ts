import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const runtime = "nodejs";

export async function GET() {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      llmProvider: true,
      vectorDb: true,
      browser: true,
      implicitWaitSeconds: true,
      headless: true,
    },
  });

  return NextResponse.json({ settings: settings ?? null });
}
