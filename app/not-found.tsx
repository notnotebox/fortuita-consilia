import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-5 py-16 sm:px-8">
      <section className="w-full border-t border-border pt-6 sm:pt-8">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Fortuita Consilia
        </p>
        <h1 className="mt-4 font-heading text-3xl leading-tight sm:text-4xl">
          This page is not available.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          The page may have moved, expired, or never been public.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex text-sm underline underline-offset-4 hover:text-foreground"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
