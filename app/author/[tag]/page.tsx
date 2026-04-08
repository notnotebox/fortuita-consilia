import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCard, type Message } from "@/components/message-card";
import { prisma } from "@/lib/prisma";
import { getUserTag } from "@/lib/user-tag";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

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

  const users = await prisma.user.findMany({
    where: {
      messages: { some: {} },
    },
    select: {
      id: true,
      name: true,
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

  const messages: Message[] = author.messages.map((message) => ({
    id: message.id,
    pseudo,
    avatar: author.image ?? undefined,
    content: message.content,
    ratio: String(message.tries),
    date: formatDateLabel(message.createdAt),
    authorTag: tag,
  }));

  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center">
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

              <dl className="self-center text-sm text-muted-foreground">
                <div className="flex items-baseline justify-end gap-3 leading-none">
                  <dt className="text-right text-xs uppercase tracking-[0.12em]">Tag</dt>
                  <dd className="w-14 text-right font-medium text-foreground">{tag}</dd>
                </div>
                <div className="mt-1 flex items-baseline justify-end gap-3 leading-none">
                  <dt className="text-right text-xs uppercase tracking-[0.12em]">Messages</dt>
                  <dd className="w-14 text-right tabular-nums font-medium text-foreground">
                    {messages.length}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Button asChild variant="ghost">
                <Link href="/" className="inline-flex items-center gap-1.5">
                  Home
                  <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="mx-auto w-full sm:w-xl">
            {messages.length > 0 ? (
              <div className="space-y-0">
                {messages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    showAuthorMeta={false}
                    align="left"
                    withHorizontalInset={false}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            )}
          </section>
        </div>
      </article>
    </div>
  );
}
