import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { type Message } from "@/components/message-card";
import { MessageDetail } from "@/components/message-detail";
import { prisma } from "@/lib/prisma";
import {
  buildPainMetrics,
  fromPublicMessageId,
  toPublicMessageId,
} from "@/lib/message-metrics";
import { getUserTag } from "@/lib/user-tag";

type AuthorMessagePageProps = {
  params: Promise<{ tag: string; id: string }>;
};

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function AuthorMessagePage({ params }: AuthorMessagePageProps) {
  const { tag, id: rawId } = await params;
  const shortId = fromPublicMessageId(rawId);
  if (!shortId) notFound();

  const [session, dbMessage] = await Promise.all([
    auth(),
    prisma.message.findUnique({
      where: { shortId },
      select: {
        id: true,
        shortId: true,
        content: true,
        tries: true,
        consumedCount: true,
        length: true,
        createdAt: true,
        authorId: true,
        author: {
          select: {
            id: true,
            name: true,
            discordTag: true,
            email: true,
            image: true,
          },
        },
      },
    }),
  ]);
  const currentUserId = session?.user?.id;

  if (!dbMessage || !dbMessage.author) {
    notFound();
  }

  const computedTag = getUserTag(dbMessage.author);
  if (computedTag !== tag) {
    notFound();
  }

  const metrics = buildPainMetrics({
    iterations: dbMessage.tries,
    consumed: dbMessage.consumedCount,
    length: dbMessage.length,
  });

  const message: Message = {
    id: dbMessage.id,
    publicId: toPublicMessageId(dbMessage.shortId),
    content: dbMessage.content,
    ratio: metrics.ratioLabel,
    ratioDetails: metrics.ratioDetails,
    pseudo:
      dbMessage.author?.name || dbMessage.author?.email?.split("@")[0] || "Unknown",
    avatar: dbMessage.author?.image ?? undefined,
    authorTag: computedTag,
    userId:
      dbMessage.authorId && dbMessage.authorId === currentUserId
        ? dbMessage.authorId
        : undefined,
    date: formatDateLabel(dbMessage.createdAt),
  };

  const sharePath = `/${computedTag}/${message.publicId ?? message.id}`;

  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Message.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A focused, shareable entry. Pass it on, then write your own.
            </p>
        </header>

        <MessageDetail message={message} sharePath={sharePath} />
      </article>
    </div>
  );
}

