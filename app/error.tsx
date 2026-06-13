"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-8">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              This page couldn&apos;t load.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A server error occurred while preparing this view.
              <br />
              You can try again now.
            </p>
          </header>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={reset}>
              Reload
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}

