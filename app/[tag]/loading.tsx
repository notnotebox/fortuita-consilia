import Link from "next/link";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

function RectangleSkeleton({ className = "" }: { className?: string }) {
  return <div className={`w-full rounded-sm bg-muted/20 animate-pulse ${className}`} />;
}

export default function AuthorLoading() {
  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">Author.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A selected profile and a chronological view of published messages.
            </p>
          </header>
          <section className="mx-auto w-full space-y-5 sm:w-xl">
            <RectangleSkeleton className="h-12" />
            <Button asChild variant="ghost">
              <Link href="/" className="inline-flex items-center gap-1.5">
                Write a new message
                <PencilLine className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </section>
          <section className="mx-auto w-full sm:w-xl">
            <div className="py-4"><RectangleSkeleton className="h-12" /></div>
            <div className="py-4"><RectangleSkeleton className="h-12" /></div>
            <div className="py-4"><RectangleSkeleton className="h-12" /></div>
          </section>
        </div>
      </article>
    </div>
  );
}
