import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST() {
  // Simulate a successful KB build; real implementation can be added later.
  return NextResponse.json({
    status: "ready",
    message: "Knowledge base built successfully",
    completedAt: new Date().toISOString(),
  })
}