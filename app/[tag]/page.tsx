import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { type Message } from "@/components/message-card";
import { MessageList } from "@/components/message-list";
import { prisma } from "@/lib/prisma";
import { buildPainMetrics, toPublicMessageId } from "@/lib/message-metrics";
import { getUserTag } from "@/lib/user-tag";
import { PencilLine } from "lucide-react";
import { auth } from "@/auth";

type AuthorPageProps = {
  params: Promise<{ tag: string }>;
};

function UnavailableAuthorPage() {
  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <header>
          <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
            Author.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
            This author or their messages are not publicly available.
          </p>
        </header>
      </article>
    </div>
  );
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { tag } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id;

  const users = await prisma.user.findMany({
    where: {
      messages: { some: {} },
    },
    select: {
      id: true,
      name: true,
      discordTag: true,
      email: true,
      image: true,
    },
  });

  const author = users.find((user) => getUserTag(user) === tag);
  if (!author) return <UnavailableAuthorPage />;

  const pseudo = author.name || author.email?.split("@")[0] || "Unknown";
  const initials = pseudo.slice(0, 2).toUpperCase();
  const displayTag = author.discordTag || tag.replace(/-/g, ".");
  const isLongTag = displayTag.length > 14;

  const [initialDbMessages, totalMessages] = await Promise.all([
    prisma.message.findMany({
      where: { authorId: author.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        shortId: true,
        content: true,
        tries: true,
        consumedCount: true,
        length: true,
        createdAt: true,
      },
    }),
    prisma.message.count({
      where: { authorId: author.id },
    }),
  ]);

  const messages: Message[] = initialDbMessages.map((message) => {
    const metrics = buildPainMetrics({
      iterations: message.tries,
      consumed: message.consumedCount,
      length: message.length,
    });
    return {
      id: message.id,
      publicId: toPublicMessageId(message.shortId),
      pseudo,
      avatar: author.image ?? undefined,
      content: message.content,
      ratio: metrics.ratioLabel,
      ratioDetails: metrics.ratioDetails,
      date: formatDateLabel(message.createdAt),
      authorTag: tag,
      userId: currentUserId && currentUserId === author.id ? author.id : undefined,
    };
  });

  if (totalMessages === 0) return <UnavailableAuthorPage />;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="shrink-0 bg-background/20 pt-8 sm:pt-12">
        <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8 sm:py-9">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Author.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A selected profile and a chronological view of published messages.
            </p>
          </header>

          <section className="mx-auto mt-8 w-full space-y-5 sm:mt-12 sm:w-xl">
            <div className="flex items-center justify-between gap-6">
              <div className="inline-flex min-w-0 items-center gap-3">
                <Avatar size="lg">
                  <AvatarImage src={author.image ?? undefined} alt={pseudo} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 truncate text-base text-foreground sm:text-lg">
                  {pseudo}
                </p>
              </div>

              <dl
                className={`self-center grid items-baseline justify-end gap-x-3 gap-y-1 text-sm text-muted-foreground ${
                  isLongTag
                    ? "grid-cols-[auto_minmax(9rem,12rem)]"
                    : "grid-cols-[auto_max-content]"
                }`}
              >
                <dt className="text-right text-xs uppercase tracking-[0.12em]">
                  Tag
                </dt>
                <dd
                  className={`text-right font-medium text-foreground ${
                    isLongTag ? "break-words leading-tight" : "whitespace-nowrap"
                  }`}
                  title={displayTag}
                >
                  {displayTag}
                </dd>
                <dt className="text-right text-xs uppercase tracking-[0.12em]">
                  Messages
                </dt>
                <dd className="text-right tabular-nums font-medium text-foreground">
                  {totalMessages}
                </dd>
              </dl>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Button asChild variant="ghost">
                <Link href="/" className="inline-flex items-center gap-1.5">
                  Write a new message
                  <PencilLine className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-background">
          <MessageList
            source={{ kind: "author", authorId: author.id }}
            initialMessages={messages}
            totalCount={totalMessages}
            layout="author"
            maxLines={5}
            scroll="fill"
            viewportClassName="py-8 sm:py-12"
          />
      </div>
    </div>
  );
}
