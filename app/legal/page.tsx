import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PencilLine } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "The essential rules and responsibilities for using Fortuita Consilia.",
};

const textClassName = "text-[0.98rem] leading-7";

export default function LegalPage() {
  const portfolioUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim();

  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Legal.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A few essential rules for using this open-source service.
            </p>
          </header>

          <section className="space-y-4">
            <p className={textClassName}>
              The service is provided as is. It may change, pause, or stop
              without notice.
            </p>
            <p className={textClassName}>
              You are responsible for what you publish. Do not submit unlawful,
              harmful, abusive, or sensitive content.
            </p>
            <p className={textClassName}>
              Do not disrupt the service, bypass its limits, or access another
              person’s account or data.
            </p>
            <p className={textClassName}>
              By using the service, you accept these rules and the Privacy policy.
            </p>
          </section>

          <section className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              The source code is open source. The service is hosted on Vercel.
              Availability and third-party infrastructure are not guaranteed.
            </p>
            {portfolioUrl ? (
              <p>
                The maintainer and contact details are available through the{" "}
                <a className="underline underline-offset-4" href={portfolioUrl} target="_blank" rel="noreferrer">portfolio</a>.
              </p>
            ) : null}
          </section>

          <section className="space-y-16">
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

