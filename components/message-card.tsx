"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { normalizeUserTag } from "@/lib/user-tag";
import { Flag, Origami, Trash2 } from "lucide-react";

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
  pseudo: string;
  content: string;
  ratio: string;
  date?: string;
  avatar?: string;
  authorTag?: string;
  userId?: string;
}

interface MessageCardProps {
  message: Message;
  showAuthorMeta?: boolean;
  align?: "center" | "left";
  withHorizontalInset?: boolean;
  currentUserId?: string;
  onDelete?: (messageId: string) => Promise<void>;
}

export const MessageCard = React.forwardRef<HTMLDivElement, MessageCardProps>(
  (
    {
      message,
      showAuthorMeta = true,
      align = "center",
      withHorizontalInset = true,
      currentUserId,
      onDelete,
    },
    ref,
  ) => {
    const initials = message.pseudo.slice(0, 2).toUpperCase();
    const authorHref = `/author/${message.authorTag ?? normalizeUserTag(message.pseudo)}`;
    const displayContent = formatDisplayText(message.content);
    const isOwner =
      currentUserId && message.userId && currentUserId === message.userId;
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDelete = async () => {
      if (onDelete && !isDeleting) {
        setIsDeleting(true);
        try {
          await onDelete(message.id);
        } finally {
          setIsDeleting(false);
        }
      }
    };

    return (
      <div ref={ref} className="w-full py-4">
        <div
          className={`mx-auto w-full max-w-6xl ${
            withHorizontalInset ? "px-2 sm:px-4" : ""
          }`}
        >
          <div
            className={`relative w-full max-w-2xl sm:w-xl ${
              align === "center" ? "mx-auto" : ""
            }`}
          >
            {/* Mobile layout */}
            <div className="min-[740px]:hidden">
              <div className="rounded-md bg-muted/10 py-0 text-sm text-muted-foreground break-words whitespace-pre-wrap leading-relaxed min-h-12 text-left mb-2">
                {displayContent}
              </div>

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
                      <Origami className="size-3.5" aria-hidden="true" />
                    </span>
                    {message.date ? (
                      <span className="mt-0.5 text-[11px] text-muted-foreground/80">
                        {message.date}
                      </span>
                    ) : null}
                  </div>
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
                    onClick={isOwner ? handleDelete : undefined}
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

            {showAuthorMeta ? (
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

            <div className="absolute top-0 left-full ml-4 hidden min-[740px]:block">
              <div className="inline-flex items-start gap-4">
                <div className="inline-flex flex-col items-start whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {message.ratio}
                    <Origami className="size-3.5" aria-hidden="true" />
                  </span>
                  {message.date ? (
                    <span className="mt-0.5 text-[11px] text-muted-foreground/80">
                      {message.date}
                    </span>
                  ) : null}
                </div>
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
                  onClick={isOwner ? handleDelete : undefined}
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
            <div className="hidden min-[740px]:block rounded-md bg-muted/10 py-0 text-sm text-muted-foreground break-words whitespace-pre-wrap leading-relaxed min-h-12 text-left">
              {displayContent}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MessageCard.displayName = "MessageCard";
