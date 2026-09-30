import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isModerator } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isModerator(userId))) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid-json" }, { status: 400 });
  }

  if (body.status !== "reviewed" && body.status !== "dismissed") {
    return NextResponse.json({ ok: false, reason: "invalid-status" }, { status: 400 });
  }

  const result = await prisma.report.updateMany({
    where: { id },
    data: { status: body.status, reviewedAt: new Date() },
  });

  if (result.count !== 1) {
    return NextResponse.json({ ok: false, reason: "report-not-found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
