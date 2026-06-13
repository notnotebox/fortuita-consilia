"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

type ShareMessageButtonProps = {
  messageId?: string;
  sharePath?: string;
};

export function ShareMessageButton({ messageId, sharePath }: ShareMessageButtonProps) {
  const [status, setStatus] = React.useState<"idle" | "copied" | "error">("idle");

  const handleShare = async () => {
    const fallbackPath = messageId ? `/message/${messageId}` : "/";
    const url = `${window.location.origin}${sharePath ?? fallbackPath}`;

    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1800);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleShare}>
      <Share2 className="size-3.5" aria-hidden="true" />
      {status === "copied" ? "Link copied!" : status === "error" ? "Copy failed" : "Share"}
    </Button>
  );
}
