// app/api/knowledge-base/build/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileId, userId } = body;
    if (!fileId) {
      return NextResponse.json({ error: "fileId required" }, { status: 400 });
    }

    const file = await prisma.file.findUnique({ where: { id: fileId }});
    if (!file) return NextResponse.json({ error: "file not found" }, { status: 404 });

    const job = await prisma.knowledgeBaseJob.create({
      data: { fileId, userId: userId ?? null, status: "pending" },
    });

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
