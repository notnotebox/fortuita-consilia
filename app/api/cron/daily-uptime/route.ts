import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getUtcDayDate(date = new Date()) {
  return new Date(date.toISOString().slice(0, 10));
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const day = getUtcDayDate();

  const record = await prisma.dailyUptime.upsert({
    where: { day },
    update: {},
    create: {
      day,
      source: "vercel-cron",
    },
    select: {
      id: true,
      day: true,
      source: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    heartbeat: {
      ...record,
      day: record.day.toISOString().slice(0, 10),
    },
  });
}
