import Link from "next/link";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MessageLoading() {
  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">Message.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A focused, shareable entry. Pass it on, then write your own.
            </p>
          </header>
          <section className="mx-auto w-full sm:w-xl">
            <div className="py-4">
              <div className="h-12 w-full rounded-sm bg-muted/20 animate-pulse" />
            </div>
          </section>
          <section className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-8 w-20 rounded bg-muted/30 animate-pulse" />
            <Button asChild variant="outline">
              <Link href="/" className="inline-flex items-center gap-1.5">
                Write your own
                <PencilLine className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </section>
        </div>
      </article>
    </div>
  );
}
