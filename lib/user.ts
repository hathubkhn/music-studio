import { prisma } from "@/lib/db"

const DEFAULT_USER_EMAIL = "default@musicstudio.local"

/** Single shared user for all server routes and pages. */
export async function getOrCreateUserId(): Promise<string> {
  const envId = process.env.DEFAULT_USER_ID?.trim()
  if (envId) {
    const existing = await prisma.user.findUnique({ where: { id: envId } })
    if (existing) return existing.id
  }

  const user = await prisma.user.upsert({
    where:  { email: DEFAULT_USER_EMAIL },
    create: { email: DEFAULT_USER_EMAIL, name: "Studio User" },
    update: {},
  })
  return user.id
}
