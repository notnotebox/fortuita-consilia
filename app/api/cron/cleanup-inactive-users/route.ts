import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const EMPTY_ACCOUNT_DAYS = 30;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - EMPTY_ACCOUNT_DAYS * 24 * 60 * 60 * 1000);
  const inactiveUsers = await prisma.user.findMany({
    where: {
      createdAt: { lt: cutoff },
      // Only remove accounts that have never published a message. Published
      // accounts remain available even if they later become inactive.
      messages: { none: {} },
    },
    select: { id: true },
  });

  for (const user of inactiveUsers) {
    await prisma.$transaction(async (transaction) => {
      await transaction.message.deleteMany({ where: { authorId: user.id } });
      await transaction.user.delete({ where: { id: user.id } });
    });
  }

  return NextResponse.json({
    ok: true,
    deletedUsers: inactiveUsers.length,
    emptyAccountDays: EMPTY_ACCOUNT_DAYS,
  });
}
