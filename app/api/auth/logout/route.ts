import { NextResponse } from "next/server"

// With NextAuth using JWT sessions, logout is typically handled client-side
// via next-auth's signOut(). This endpoint is provided mainly for symmetry.

export async function POST() {
  return NextResponse.json({ ok: true })
}
