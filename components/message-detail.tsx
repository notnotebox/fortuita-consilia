"use client";

import * as React from "react";
import Link from "next/link";
import { PencilLine } from "lucide-react";
import { MessageList } from "@/components/message-list";
import type { Message } from "@/components/message-card";
import { ShareMessageButton } from "@/components/share-message-button";
import { Button } from "@/components/ui/button";

type MessageDetailProps = {
  message: Message;
  sharePath?: string;
};

export function MessageDetail({ message, sharePath }: MessageDetailProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const messageRegionRef = React.useRef<HTMLDivElement | null>(null);
  const footerRef = React.useRef<HTMLElement | null>(null);
  const [contentMaxHeight, setContentMaxHeight] = React.useState<number>();

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const messageRegion = messageRegionRef.current;
    const footer = footerRef.current;
    const main = container?.closest("main");
    if (!container || !messageRegion || !footer || !main) return;

    const recalculate = () => {
      const mainBottom = main.getBoundingClientRect().bottom;
      const messageTop = messageRegion.getBoundingClientRect().top;
      const footerHeight = footer.getBoundingClientRect().height;
      // 3rem is the visual gap between the text and its actions; 2rem is card padding.
      const nextHeight = Math.max(48, mainBottom - messageTop - footerHeight - 80);
      setContentMaxHeight((current) =>
        Math.abs((current ?? 0) - nextHeight) < 1 ? current : nextHeight,
      );
    };

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(main);
    observer.observe(messageRegion);
    observer.observe(footer);
    window.addEventListener("resize", recalculate);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalculate);
    };
  }, []);

  return (
    <div ref={containerRef} className="mx-auto mt-8 w-full sm:mt-12 sm:w-xl">
      <div ref={messageRegionRef}>
        <MessageList
          source={{ kind: "single", messageId: message.publicId ?? message.id }}
          initialMessages={[message]}
          layout="single"
          maxLines={null}
          contentMaxHeight={contentMaxHeight}
        />
      </div>

      <footer ref={footerRef} className="mt-8 sm:mt-12">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ShareMessageButton
            messageId={sharePath ? undefined : (message.publicId ?? message.id)}
            sharePath={sharePath}
          />
          <Button asChild variant="outline">
            <Link href="/" className="inline-flex items-center gap-1.5">
              Write your own
              <PencilLine className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
