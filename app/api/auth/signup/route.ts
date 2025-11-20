import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email & password are required" },
        { status: 400 }
      );
    }

    // check existing user
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // hash password
    const hashed = await hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: name || "",
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("SIGNUP API ERROR →", err);

    // Important: Return JSON, NOT anything else
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
