// DO NOT import this file in any page or client component!
// This is for server-side (API route) use only to avoid circular/duplicate import errors.

import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/nextauth";

export async function requireUserId(): Promise<
  | { userId: string; response?: undefined }
  | { userId: null; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return { userId: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { userId };
}
