import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      name: true,
      discordTag: true,
      email: true,
      image: true,
      accounts: {
        select: {
          provider: true,
          providerAccountId: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          shortId: true,
          content: true,
          runId: true,
          seed: true,
          seedHash: true,
          consumedCount: true,
          opsHash: true,
          tries: true,
          length: true,
          costPerChar: true,
          lossRate: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        createdAt: user.createdAt,
        name: user.name,
        discordTag: user.discordTag,
        email: user.email,
        image: user.image,
        accounts: user.accounts,
      },
      messages: user.messages,
    },
    {
      headers: {
        "Content-Disposition": 'attachment; filename="fortuita-consilia-data.json"',
      },
    },
  );
}
