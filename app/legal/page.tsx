import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PencilLine } from "lucide-react";

const textClassName = "text-[0.98rem] leading-7";

export default function LegalPage() {
  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Legal.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              The present project is provided &quot;as is&quot;, without any
              express or implied warranty.
            </p>
          </header>

          <section className="space-y-4">
            <p className={textClassName}>
              The author shall not be held liable for any direct or indirect
              damage resulting from the use or inability to use the application.
            </p>
            <p className={textClassName}>
              The service may be modified, suspended, or discontinued at any
              time, without prior notice.
            </p>
            <p className={textClassName}>
              Users are solely responsible for the content they submit. Any
              abusive, unlawful, or harmful use of the platform is strictly
              prohibited.
            </p>
            <p className={textClassName}>
              No guarantee is given regarding service availability, reliability,
              or performance.
            </p>
            <p className={textClassName}>
              Use of this application implies full and unconditional acceptance
              of these provisions.
            </p>
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
