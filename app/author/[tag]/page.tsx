import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { type Message } from "@/components/message-card";
import { AuthorMessageList } from "@/components/author-message-list";
import { prisma } from "@/lib/prisma";
import { getUserTag } from "@/lib/user-tag";
import { PencilLine } from "lucide-react";
import { auth } from "@/auth";

type AuthorPageProps = {
  params: Promise<{ tag: string }>;
};

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
      messages: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          tries: true,
          createdAt: true,
        },
      },
    },
  });

  const author = users.find((user) => getUserTag(user) === tag);
  if (!author) notFound();

  const pseudo = author.name || author.email?.split("@")[0] || "Unknown";
  const initials = pseudo.slice(0, 2).toUpperCase();
  const displayTag = author.discordTag || tag.replace(/-/g, ".");
  const isLongTag = displayTag.length > 14;

  const messages: Message[] = author.messages.map((message) => ({
    id: message.id,
    pseudo,
    avatar: author.image ?? undefined,
    content: message.content,
    ratio: String(message.tries),
    date: formatDateLabel(message.createdAt),
    authorTag: tag,
    userId: currentUserId && currentUserId === author.id ? author.id : undefined,
  }));  

  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Author.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A selected profile and a chronological view of published messages.
            </p>
          </header>

          <section className="mx-auto w-full space-y-5 sm:w-xl">
            <div className="flex items-center justify-between gap-6">
              <div className="inline-flex min-w-0 items-center gap-3">
                <Avatar size="lg">
                  <AvatarImage src={author.image ?? undefined} alt={pseudo} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Author
                  </p>
                  <p className="truncate text-sm text-foreground">{pseudo}</p>
                </div>
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
                  {messages.length}
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

          <section className="mx-auto w-full sm:w-xl">
            {messages.length > 0 ? (
              <AuthorMessageList
                messages={messages}
                currentUserId={currentUserId}
                authorId={author.id}
                authorTag={tag}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            )}
          </section>
        </div>
      </article>
    </div>
  );
}
