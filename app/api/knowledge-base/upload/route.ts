import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || ""

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 })
  }

  const formData = await req.formData()
  const files = formData.getAll("files")

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 })
  }

  const storedFiles = files
    .filter((f): f is File => f instanceof File)
    .map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
    }))

  return NextResponse.json({ files: storedFiles })
}
