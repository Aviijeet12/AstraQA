import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";  // must exist
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });

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

    // generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      { user: newUser, token },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
