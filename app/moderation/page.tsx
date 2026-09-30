import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isModerator } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { ModerationReportList } from "@/components/moderation-report-list";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

export default async function ModerationPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isModerator(userId))) notFound();

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      messagePublicId: true,
      messageContent: true,
      authorId: true,
      authorName: true,
      authorTag: true,
      reason: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  return (
    <div className="mx-auto flex w-full flex-1 items-start justify-center py-8 sm:py-12">
      <article className="w-full max-w-4xl bg-background/20 px-5 py-6 sm:px-8 sm:py-9">
        <header>
          <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
            Moderation.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Private report queue. Reporters remain anonymous.
          </p>
        </header>
        <ModerationReportList
          reports={reports.map((report) => ({
            ...report,
            createdAt: report.createdAt.toISOString(),
            reviewedAt: report.reviewedAt?.toISOString() ?? null,
          }))}
        />
      </article>
    </div>
  );
}
