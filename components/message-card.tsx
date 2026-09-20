"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CustomScrollArea } from "@/components/custom-scroll-area";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeUserTag } from "@/lib/user-tag";
import { ArrowUpRight, Flag, Origami, Trash2 } from "lucide-react";

function formatDisplayText(text: string) {
  if (!text) return text;
  let capitalizeNext = true;
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (capitalizeNext && char >= "a" && char <= "z") {
      out += char.toUpperCase();
      capitalizeNext = false;
      continue;
    }
    out += char;
    if (char === "." || char === "!" || char === "?") {
      capitalizeNext = true;
    } else if (char.trim() !== "") {
      capitalizeNext = false;
    }
  }
  return out;
}

export interface Message {
  id: string;
  publicId?: string;
  pseudo: string;
  content: string;
  ratio: string;
  ratioDetails?: string;
  date?: string;
  avatar?: string;
  authorTag?: string;
  userId?: string;
}

interface MessageCardProps {
  message: Message;
  showAuthorMeta?: boolean;
  showMessageLink?: boolean;
  align?: "center" | "left";
  withHorizontalInset?: boolean;
  currentUserId?: string;
  onDelete?: (messageId: string) => Promise<void>;
  truncateContent?: boolean;
  maxLines?: number | null;
  scrollContent?: boolean;
  contentMaxHeight?: number;
  detailsLayout?: "side" | "inline";
}

export const MessageCard = React.forwardRef<HTMLDivElement, MessageCardProps>(
  (
    {
      message,
      showAuthorMeta = true,
      showMessageLink = true,
      align = "center",
      withHorizontalInset = true,
      currentUserId,
      onDelete,
      truncateContent = true,
      maxLines = 5,
      scrollContent = false,
      contentMaxHeight,
      detailsLayout = "side",
    },
    ref,
  ) => {
    const initials = message.pseudo.slice(0, 2).toUpperCase();
    const authorHref = `/${message.authorTag ?? normalizeUserTag(message.pseudo)}`;
    const messageHref = message.authorTag
      ? `/${message.authorTag}/${message.publicId ?? message.id}`
      : `/message/${message.publicId ?? message.id}`;
    const displayContent = formatDisplayText(message.content);
    const isOwner =
      currentUserId && message.userId && currentUserId === message.userId;
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const hasTextLimit = truncateContent && typeof maxLines === "number" && maxLines > 0;
    const isTextScrollable = hasTextLimit || scrollContent;
    const textMaxHeight = hasTextLimit
      ? Math.ceil(maxLines * 1.625 * 14)
      : contentMaxHeight;
    const [hasScrolledText, setHasScrolledText] = React.useState(false);
    const messageLinkClassName = hasScrolledText
      ? "bg-gradient-to-r from-transparent via-foreground/10 to-foreground/20 text-foreground ring-1 ring-foreground/20 hover:text-foreground"
      : "text-muted-foreground/70 hover:text-muted-foreground";
    const contentClasses = "rounded-md bg-muted/10 py-0 text-sm text-muted-foreground break-words whitespace-pre-wrap leading-relaxed text-left";

    const renderMessageContent = (mobile = false) => {
      if (isTextScrollable && textMaxHeight) {
        return (
          <CustomScrollArea
            autoHeight
            maxHeight={textMaxHeight}
            className={mobile ? "mb-2" : undefined}
            viewportClassName={contentClasses}
            contentClassName="min-h-12 pr-4"
            onViewportScroll={(scrollTop) => {
              if (scrollTop > 2) setHasScrolledText(true);
            }}
            onViewportPointerLeave={() => setHasScrolledText(false)}
          >
            {displayContent}
          </CustomScrollArea>
        );
      }

      return (
        <div className={mobile ? `${contentClasses} mb-2` : contentClasses}>
          {displayContent}
        </div>
      );
    };

    const handleDelete = async () => {
      if (onDelete && !isDeleting) {
        setIsDeleting(true);
        try {
          await onDelete(message.id);
          setIsDeleteDialogOpen(false);
        } finally {
          setIsDeleting(false);
        }
      }
    };

    return (
      <>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this message?</DialogTitle>
              <DialogDescription>
                This action is permanent. The message will be removed from the feed and cannot be recovered.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isDeleting}>Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete message"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div ref={ref} data-message-card className="w-full py-4">
        <div
          className={`mx-auto w-full max-w-6xl ${
            withHorizontalInset ? "px-2 sm:px-4" : ""
          }`}
        >
          <div
            className={`relative w-full max-w-xl ${
              align === "center" ? "mx-auto" : ""
            }`}
          >
            {/* Mobile layout */}
            <div className={detailsLayout === "inline" ? "" : "min-[740px]:hidden"}>
              {renderMessageContent(true)}

              <div
                className={`flex items-center gap-2 ${showAuthorMeta ? "justify-between" : "justify-end"}`}
              >
                {showAuthorMeta ? (
                  <>
                    <Link
                      href={authorHref}
                      className="flex flex-1 min-w-0 items-center gap-2 rounded-md transition-colors hover:text-foreground"
                    >
                      <Avatar size="sm">
                        <AvatarImage
                          src={message.avatar}
                          alt={message.pseudo}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span
                        className="truncate text-xs uppercase tracking-[0.12em] text-muted-foreground"
                        title={message.pseudo}
                      >
                        {message.pseudo}
                      </span>
                    </Link>
                  </>
                ) : null}

                <div className="shrink-0 inline-flex items-start gap-4">
                  <div className="inline-flex flex-col items-end whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {message.ratio}
                      <span title={message.ratioDetails}>
                        <Origami className="size-3.5" aria-hidden="true" />
                      </span>
                    </span>
                    {message.date ? (
                      <span className="mt-0.5 text-[11px] text-muted-foreground/80">
                        {message.date}
                      </span>
                    ) : null}
                  </div>
                  {showMessageLink ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-xs"
                      className={messageLinkClassName}
                      aria-label="Read full message"
                      title="Read full message"
                    >
                      <Link href={messageHref}>
                        <ArrowUpRight className="size-3" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={`${
                      isOwner
                        ? "text-muted-foreground/70 hover:text-destructive"
                        : "text-muted-foreground/70 hover:text-muted-foreground"
                    }`}
                    aria-label={
                      isOwner ? "Delete this message" : "Report this message"
                    }
                    title={
                      isOwner ? "Delete this message" : "Report this message"
                    }
                    onClick={isOwner ? () => setIsDeleteDialogOpen(true) : undefined}
                    disabled={isDeleting}
                  >
                    {isOwner ? (
                      <Trash2 className="size-3" aria-hidden="true" />
                    ) : (
                      <Flag className="size-3" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {showAuthorMeta && detailsLayout !== "inline" ? (
              <div className="absolute top-0 right-full mr-4 hidden w-[7.5rem] min-[740px]:block">
                <div className="flex items-center gap-2">
                  <Link
                    href={authorHref}
                    className="flex min-w-0 items-center gap-2 rounded-md transition-colors hover:text-foreground"
                  >
                    <Avatar size="sm">
                      <AvatarImage src={message.avatar} alt={message.pseudo} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <span
                      className="truncate text-xs uppercase tracking-[0.12em] text-muted-foreground"
                      title={message.pseudo}
                    >
                      {message.pseudo}
                    </span>
                  </Link>
                </div>
              </div>
            ) : null}

            <div className={detailsLayout === "inline" ? "hidden" : "absolute top-0 left-full ml-4 hidden min-[740px]:block"}>
              <div className="inline-flex items-start gap-4">
                <div className="inline-flex flex-col items-start whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {message.ratio}
                    <span title={message.ratioDetails}>
                      <Origami className="size-3.5" aria-hidden="true" />
                    </span>
                  </span>
                  {message.date ? (
                    <span className="mt-0.5 text-[11px] text-muted-foreground/80">
                      {message.date}
                    </span>
                  ) : null}
                </div>
                {showMessageLink ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-xs"
                    className={messageLinkClassName}
                    aria-label="Read full message"
                    title="Read full message"
                  >
                    <Link href={messageHref}>
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={`${
                    isOwner
                      ? "text-muted-foreground/70 hover:text-destructive"
                      : "text-muted-foreground/70 hover:text-muted-foreground"
                  }`}
                  aria-label={
                    isOwner ? "Delete this message" : "Report this message"
                  }
                  title={
                    isOwner ? "Delete this message" : "Report this message"
                  }
                    onClick={isOwner ? () => setIsDeleteDialogOpen(true) : undefined}
                  disabled={isDeleting}
                >
                  {isOwner ? (
                    <Trash2 className="size-3" aria-hidden="true" />
                  ) : (
                    <Flag className="size-3" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>

            {/* Desktop layout */}
            <div className={detailsLayout === "inline" ? "hidden" : "hidden min-[740px]:block"}>
              {renderMessageContent()}
            </div>
          </div>
        </div>
        </div>
      </>
    );
  },
);

MessageCard.displayName = "MessageCard";

