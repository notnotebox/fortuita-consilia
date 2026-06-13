import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { MessageCard, type Message } from "@/components/message-card";
import { ShareMessageButton } from "@/components/share-message-button";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getUserTag } from "@/lib/user-tag";
import { PencilLine } from "lucide-react";
import {
  buildPainMetrics,
  fromPublicMessageId,
  toPublicMessageId,
} from "@/lib/message-metrics";

type MessagePageProps = {
  params: Promise<{ id: string }>;
};

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function MessagePage({ params }: MessagePageProps) {
  const { id: rawId } = await params;
  const shortId = fromPublicMessageId(rawId);
  if (!shortId) {
    notFound();
  }

  const session = await auth();
  const currentUserId = session?.user?.id;

  const dbMessage = await prisma.message.findUnique({
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
          name: true,
          discordTag: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!dbMessage) {
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
    pseudo: dbMessage.author?.name || dbMessage.author?.email?.split("@")[0] || "Unknown",
    avatar: dbMessage.author?.image ?? undefined,
    authorTag: getUserTag(dbMessage.author ?? {}),
    userId:
      dbMessage.authorId && dbMessage.authorId === currentUserId
        ? dbMessage.authorId
        : undefined,
    date: formatDateLabel(dbMessage.createdAt),
  };

  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Message.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A focused, shareable entry. Pass it on, then write your own.
            </p>
          </header>

          <section className="mx-auto w-full sm:w-xl">
            <MessageCard
              message={message}
              currentUserId={currentUserId}
              align="left"
              withHorizontalInset={false}
              showMessageLink={false}
            />
          </section>

          <section className="space-y-16">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <ShareMessageButton messageId={message.publicId ?? message.id} />
              <Button asChild variant="outline">
                <Link href="/" className="inline-flex items-center gap-1.5">
                  Write your own
                  <PencilLine className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}

