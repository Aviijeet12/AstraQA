import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const token = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("❌ Missing JWT_SECRET");
      return NextResponse.json(
        { error: "Server config missing" },
        { status: 500 }
      );
    }

    const user = verify(token, secret);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
