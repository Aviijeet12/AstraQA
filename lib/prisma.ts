import * as Prisma from "@prisma/client"

const { PrismaClient } = Prisma

const globalForPrisma = globalThis as unknown as { prisma?: Prisma.PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
