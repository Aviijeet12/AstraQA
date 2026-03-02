import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("[auth] JWT_SECRET is not configured. Legacy JWT auth will not work.");
}

export async function auth(req: Request) {
  try {
    if (!JWT_SECRET) return null;

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return null;
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    return user;
  } catch (error) {
    return null;
  }
}
