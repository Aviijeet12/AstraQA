import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { prisma } from "@/lib/db"
import { callGemini } from "@/lib/gemini"
import { callHuggingFace } from "@/lib/hf"

export async function GET() {
  // Example stubs; uncomment and customize as needed.

  // await prisma.$queryRaw`SELECT 1` // DB health check

  // const { error: supabaseError } = await supabase.from("some_table").select("id").limit(1)
  // if (supabaseError) {
  //   console.error("Supabase error", supabaseError)
  // }

  // const geminiResp = await callGemini("gemini-1.5-pro", {
  //   contents: [{ parts: [{ text: "Hello from AstraQA" }] }],
  // })

  // const hfResp = await callHuggingFace("gpt2", { inputs: "Hello from AstraQA" })

  return NextResponse.json({ ok: true })
}
