import { NextResponse } from "next/server"

export const runtime = "nodejs"

type SettingsPayload = {
  llmProvider?: string
  vectorDb?: string
  apiKeyMasked?: boolean
  defaultBrowser?: string
  implicitWaitSeconds?: number
  headless?: boolean
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SettingsPayload

  // For now we just echo back a success response. In a real
  // implementation you would persist this to a database or
  // encrypted storage bound to the user.

  return NextResponse.json({
    status: "ok",
    saved: body,
  })
}
