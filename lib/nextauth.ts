import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const hasEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0;
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  // Remove signIn page override to allow public dashboard access
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.password) return null;

        const ok = await compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),

    ...(hasEnv("GOOGLE_CLIENT_ID") && hasEnv("GOOGLE_CLIENT_SECRET")
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),

    ...(hasEnv("GITHUB_ID") && hasEnv("GITHUB_SECRET")
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, persist user in Prisma (by email).
      if (account?.provider && account.provider !== "credentials") {
        const email = user.email?.trim().toLowerCase();
        if (!email) return false;

        const dbUser = await prisma.user.upsert({
          where: { email },
          update: {
            name: user.name ?? undefined,
          },
          create: {
            email,
            name: user.name ?? "",
            password: null,
          },
          select: { id: true },
        });

        // Ensure downstream callbacks can see a stable id.
        (user as any).id = dbUser.id;
      }

      return true;
    },
    async jwt({ token, user }) {
      // Persist user id onto token.
      if (user) {
        token.userId = (user as any).id;
      }

      // Fallback: look up by email if needed.
      if (!token.userId && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
          select: { id: true },
        });
        if (dbUser) token.userId = dbUser.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId as string | undefined;
      }
      return session;
    },
  },
};
