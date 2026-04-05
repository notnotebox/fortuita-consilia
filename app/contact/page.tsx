import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full flex-1 items-center justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-8">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Contact.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              Community feedback and questions are handled on GitHub.
            </p>
          </header>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link
                href="https://github.com/notnotebox/fortuita-consilia"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
              >
                Open GitHub
              </Link>
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}
