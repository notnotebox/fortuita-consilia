import { prisma } from "@/lib/prisma";

function getAllowedDiscordIds(): string[] {
  return (process.env.MODERATOR_DISCORD_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function isModerator(userId: string): Promise<boolean> {
  const allowedDiscordIds = getAllowedDiscordIds();
  if (allowedDiscordIds.length === 0) return false;

  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "discord",
      providerAccountId: { in: allowedDiscordIds },
    },
    select: { id: true },
  });

  return Boolean(account);
}
