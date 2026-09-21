import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PencilLine } from "lucide-react";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { auth } from "@/auth";

const textClassName = "text-[0.98rem] leading-7";

export default async function PrivacyPage() {
  const session = await auth();
  const portfolioUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim();

  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Privacy.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              What we store, how long we keep it, and how to remove it.
            </p>
          </header>

          <section className="space-y-4">
            <p className={textClassName}>
              Discord provides the account information needed to sign in and
              identify you. Published messages and their technical metadata are
              stored with them.
            </p>
            <p className={textClassName}>
              This data is used to operate the service, protect it from abuse,
              and keep messages available. It is not sold or used for
              advertising.
            </p>
            <p className={textClassName}>
              Do not submit sensitive personal information in a message.
            </p>
            <p className={textClassName}>
              Empty accounts with no published message may be removed after 30
              days. Published messages are kept indefinitely so the public
              archive remains available.
            </p>
          </section>

          <section className="space-y-8 border-t border-border pt-8">
            <div className="space-y-3">
              <h2 className="font-heading text-xl">Delete everything.</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Download a JSON copy of your account and messages, then delete
                everything permanently. You will be signed out.
              </p>
              {session?.user?.id ? <DeleteAccountButton /> : null}
            </div>
          </section>

          {portfolioUrl ? (
            <p className="text-sm text-muted-foreground">
              For questions about this service or your data, contact the
              maintainer through the <a className="underline underline-offset-4" href={portfolioUrl} target="_blank" rel="noreferrer">portfolio</a>.
            </p>
          ) : null}

          <section>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Button asChild variant="outline">
                <Link href="/" className="inline-flex items-center gap-1.5">
                  Write a new message
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
