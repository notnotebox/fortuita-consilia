import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <header>
          <h1 className="font-heading text-3xl leading-tight sm:text-4xl">Page.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
            This page is unavailable.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex text-sm underline underline-offset-4 hover:text-foreground"
          >
            Return home
          </Link>
        </header>
      </article>
    </div>
  );
}
