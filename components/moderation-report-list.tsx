"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Report = {
  id: string;
  messagePublicId: string;
  messageContent: string;
  authorId: string | null;
  authorName: string;
  authorTag: string;
  reason: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
};

export function ModerationReportList({ reports }: { reports: Report[] }) {
  const [items, setItems] = React.useState(reports);
  const [updating, setUpdating] = React.useState<string | null>(null);

  const updateStatus = async (id: string, status: "reviewed" | "dismissed") => {
    setUpdating(id);
    try {
      const response = await fetch(`/api/moderation/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) return;
      setItems((current) =>
        current.map((report) =>
          report.id === id
            ? { ...report, status, reviewedAt: new Date().toISOString() }
            : report,
        ),
      );
    } finally {
      setUpdating(null);
    }
  };

  if (items.length === 0) {
    return <p className="mt-12 text-sm text-muted-foreground">No reports yet.</p>;
  }

  return (
    <div className="mt-10 space-y-6">
      {items.map((report) => (
        <section key={report.id} className="space-y-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{report.authorName}</p>
              <p className="text-muted-foreground">{report.authorTag}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{report.status}</p>
              <p>{new Date(report.createdAt).toLocaleString("en-US")}</p>
            </div>
          </div>
          <div className="rounded-md bg-muted/10 p-4 text-sm leading-6 whitespace-pre-wrap break-words">
            {report.messageContent}
          </div>
          <p className="text-xs text-muted-foreground">
            Message ID: {report.messagePublicId}
          </p>
          {report.authorId ? (
            <p className="text-xs text-muted-foreground">
              Account ID: {report.authorId}
            </p>
          ) : null}
          {report.reason ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Context:</span>{" "}
              {report.reason}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/message/${report.messagePublicId}`} target="_blank">
                Open message
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={updating === report.id}
              onClick={() => void updateStatus(report.id, "reviewed")}
            >
              Mark reviewed
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={updating === report.id}
              onClick={() => void updateStatus(report.id, "dismissed")}
            >
              Dismiss
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}
