import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink as ExternalLinkIcon, Star } from "lucide-react";
import { AboutCopyToggle } from "./about-copy-toggle";

const linkClassName = "underline-offset-4 transition-colors hover:underline";
const linkClassNameNoUnderline = "transition-colors";
const labelClassName = "uppercase tracking-[0.12em]";
const techListClassName =
  "grid gap-x-6 gap-y-3 text-sm text-muted-foreground min-[740px]:grid-cols-[120px_max-content]";

const techColumns = [
  [
    {
      label: "Framework",
      links: [{ href: "https://nextjs.org", label: "Next.js" }],
    },
    {
      label: "Database",
      links: [
        { href: "https://www.postgresql.org", label: "PostgreSQL" },
        { href: "https://supabase.com", label: "Supabase" },
      ],
    },
    {
      label: "ORM",
      links: [{ href: "https://www.prisma.io", label: "Prisma" }],
    },
  ],
  [
    {
      label: "Design",
      links: [
        { href: "https://www.figma.com", label: "Figma" },
        { href: "https://www.notion.so", label: "Notion" },
      ],
    },
    {
      label: "UI",
      links: [{ href: "https://ui.shadcn.com", label: "shadcn/ui components" }],
    },
    {
      label: "Hosting",
      links: [{ href: "https://vercel.com", label: "Vercel" }],
    },
  ],
];
const mobileTechItems = techColumns.flat();

function ExternalLink({
  href,
  children,
  className = "",
  underline = true,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  underline?: boolean;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${underline ? linkClassName : linkClassNameNoUnderline} ${className}`.trim()}
    >
      {children}
    </Link>
  );
}

function TechList({
  items,
}: {
  items: { label: string; links: { href: string; label: string }[] }[];
}) {
  return (
    <dl className={`hidden min-[740px]:grid ${techListClassName}`}>
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className={labelClassName}>{item.label}</dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            {item.links.map((link, index) => (
              <span key={link.href} className="inline-flex items-center gap-1.5">
                {index > 0 && (
                  <span aria-hidden="true" className="text-border">
                    ·
                  </span>
                )}
                <ExternalLink href={link.href}>{link.label}</ExternalLink>
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full flex-1 items-center justify-center py-8 sm:py-12">
      <article className="w-full max-w-2xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <div className="space-y-16">
          <header>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Fortuita Consilia.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              A project undertaken for reasons that do not necessarily call for
              explanation.
            </p>
          </header>

          <AboutCopyToggle />

          <section className="space-y-16">
            <div className="mx-auto grid w-full max-w-2xl gap-8 min-[740px]:grid-cols-2 min-[740px]:gap-x-12">
              <ul className="space-y-2 text-sm text-muted-foreground min-[740px]:hidden">
                {mobileTechItems.map((item) => (
                  <li
                    key={item.label}
                    className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-x-6 leading-7"
                  >
                    <span className={`${labelClassName} whitespace-nowrap`}>
                      {item.label}
                    </span>
                    <span>
                      {item.links.map((link, index) => (
                        <span key={link.href}>
                          {index > 0 ? <span className="text-border"> · </span> : null}
                          <ExternalLink href={link.href}>{link.label}</ExternalLink>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <TechList items={techColumns[0]} />
              <TechList items={techColumns[1]} />
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Button asChild variant="outline">
                <ExternalLink
                  href="https://github.com/notnotebox/fortuita-consilia"
                  underline={false}
                >
                  GitHub
                  <Star className="size-3.5" aria-hidden="true" />
                </ExternalLink>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/" className="inline-flex items-center gap-1.5">
                  Portfolio
                  <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
