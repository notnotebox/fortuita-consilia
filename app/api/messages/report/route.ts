import { NextResponse } from "next/server";
import { fromPublicMessageId, toPublicMessageId } from "@/lib/message-metrics";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequesterIdFromHeaders } from "@/lib/requester";
import { getUserTag } from "@/lib/user-tag";

export const runtime = "nodejs";

const REPORTS_PER_WINDOW = 5;
const REPORT_WINDOW_MS = 10 * 60_000;
const MAX_REASON_LENGTH = 1000;

function getReportWebhook(): URL | null {
  const raw = process.env.DISCORD_REPORT_WEBHOOK_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const validHost =
      url.hostname === "discord.com" || url.hostname === "discordapp.com";
    if (!validHost || !url.pathname.startsWith("/api/webhooks/")) return null;
    return url;
  } catch {
    return null;
  }
}

async function notifyModerationChannel(input: {
  reportId: string;
  messagePublicId: string;
}): Promise<boolean> {
  const webhook = getReportWebhook();
  if (!webhook) return false;

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Fortuita Reports",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: "New anonymous report",
          description: "A report is waiting in the private moderation panel.",
          color: 0xb45309,
          fields: [
            { name: "Report", value: input.reportId, inline: true },
            { name: "Message", value: input.messagePublicId, inline: true },
          ],
          footer: { text: "No reporter identity or message content is sent here." },
        },
      ],
    }),
    cache: "no-store",
  });

  return response.ok;
}

export async function POST(request: Request) {
  const requesterId = getRequesterIdFromHeaders(request.headers);
  const rate = checkRateLimit({
    key: `message-report:${requesterId}`,
    max: REPORTS_PER_WINDOW,
    windowMs: REPORT_WINDOW_MS,
  });

  if (rate.limited) {
    return NextResponse.json(
      { ok: false, reason: "rate-limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
      },
    );
  }

  let body: { messageId?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as { messageId?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid-json" },
      { status: 400 },
    );
  }

  if (typeof body.messageId !== "string" || body.messageId.length > 32) {
    return NextResponse.json(
      { ok: false, reason: "invalid-message-id" },
      { status: 400 },
    );
  }

  const shortId = fromPublicMessageId(body.messageId);
  if (!shortId) {
    return NextResponse.json(
      { ok: false, reason: "invalid-message-id" },
      { status: 400 },
    );
  }

  const message = await prisma.message.findUnique({
    where: { shortId },
    select: {
      id: true,
      shortId: true,
      content: true,
      author: {
        select: {
          id: true,
          name: true,
          discordTag: true,
        },
      },
    },
  });

  if (!message) {
    return NextResponse.json(
      { ok: false, reason: "message-not-found" },
      { status: 404 },
    );
  }

  const authorName = message.author?.name || "Unknown";
  const report = await prisma.report.create({
    data: {
      messageId: message.id,
      messagePublicId: toPublicMessageId(message.shortId),
      messageContent: message.content,
      authorId: message.author?.id ?? null,
      authorName,
      authorTag: getUserTag(message.author ?? {}),
      reason:
        typeof body.reason === "string"
          ? body.reason.trim().slice(0, MAX_REASON_LENGTH) || null
          : null,
    },
    select: { id: true, messagePublicId: true },
  });

  let notificationSent = false;
  try {
    notificationSent = await notifyModerationChannel({
      reportId: report.id,
      messagePublicId: report.messagePublicId,
    });
  } catch (error) {
    console.error("[message-report] moderation notification failed", error);
  }

  return NextResponse.json(
    { ok: true, notificationSent },
    { status: 201 },
  );
}
