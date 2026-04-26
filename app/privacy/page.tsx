import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PencilLine } from "lucide-react";

const textClassName = "text-[0.98rem] leading-7";

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Privacy.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              This application only collects data strictly necessary for its
              operation.
            </p>
          </header>

          <section className="space-y-4">
            <p className={textClassName}>
              Submitted messages and certain associated metadata (such as
              generation parameters, attempts, and timestamps) may be retained
              to ensure system integrity.
            </p>
            <p className={textClassName}>
              Authentication may be performed through a third-party service
              (Discord). In that case, basic information may be accessible, such
              as user ID, display name, or avatar.
            </p>
            <p className={textClassName}>
              This data is used solely for application operation and is not
              sold, shared, or used for advertising purposes.
            </p>
            <p className={textClassName}>
              No sensitive personal data is collected.
            </p>
            <p className={textClassName}>
              Data is retained only for the period necessary for proper service
              operation.
            </p>
            <p className={textClassName}>
              Use of this application implies acceptance of this policy.
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
