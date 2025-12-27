import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Not supported",
      message:
        "This endpoint is not used. Use NextAuth sign-in from the client (next-auth/react signIn) which will call /api/auth/[...nextauth].",
    },
    { status: 410 },
  );
}
