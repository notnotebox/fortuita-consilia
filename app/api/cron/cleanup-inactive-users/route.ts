import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const EMPTY_ACCOUNT_DAYS = 30;

function isSerializationConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

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

  let deletedUsers = 0;

  for (const user of inactiveUsers) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const deleted = await prisma.$transaction(
          async (transaction) => {
            // Re-check inside the transaction so a message published after
            // the initial scan protects the account from deletion.
            const emptyUser = await transaction.user.findFirst({
              where: {
                id: user.id,
                createdAt: { lt: cutoff },
                messages: { none: {} },
              },
              select: { id: true },
            });

            if (!emptyUser) return false;

            // Published accounts are never selected here. Deleting the user
            // cascades only its auth/session records; messages are untouched.
            await transaction.user.delete({ where: { id: emptyUser.id } });
            return true;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if (deleted) deletedUsers += 1;
        break;
      } catch (error) {
        if (!isSerializationConflict(error) || attempt === 2) throw error;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    deletedUsers,
    emptyAccountDays: EMPTY_ACCOUNT_DAYS,
  });
}
