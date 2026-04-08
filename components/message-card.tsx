"use client";

import * as React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Flag, LogOut, MessageSquare, Origami } from "lucide-react";

export interface Message {
  id: string;
  pseudo: string;
  content: string;
  ratio: string;
  avatar?: string;
}

interface MessageCardProps {
  message: Message;
}

function AccountPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-[11px] leading-none text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          aria-label="Open account menu"
        >
          Account
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1.5"
        >
          <Link href="/">
            `r`n My messages`r`n{" "}
            <MessageSquare className="size-3.5" aria-hidden="true" />
            `r`n{" "}
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1.5"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Sign out
          <LogOut className="size-3.5" aria-hidden="true" />
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export const MessageCard = React.forwardRef<HTMLDivElement, MessageCardProps>(
  ({ message }, ref) => {
    const initials = message.pseudo.slice(0, 2).toUpperCase();

    return (
      <div ref={ref} className="w-full py-4">
        <div className="mx-auto w-full max-w-6xl px-2 sm:px-4">
          <div className="relative mx-auto w-full max-w-2xl sm:w-xl">
            {/* Mobile layout */}
            <div className="min-[740px]:hidden">
              <div className="rounded-md bg-muted/10 py-0 text-sm text-muted-foreground break-words whitespace-pre-wrap leading-relaxed min-h-12 text-left mb-2">
                {message.content}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar size="sm">
                    <AvatarImage src={message.avatar} alt={message.pseudo} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="relative flex-1 min-w-0">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="truncate text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {message.pseudo}
                    </span>
                    <AccountPopover />
                  </div>
                </div>

                <div className="shrink-0 inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {message.ratio}
                    <Origami className="size-3.5" aria-hidden="true" />
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground/70 hover:text-muted-foreground"
                    aria-label="Report this message"
                    title="Report this message"
                  >
                    <Flag className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-full mr-4 hidden w-[7.5rem] min-[740px]:block">
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarImage src={message.avatar} alt={message.pseudo} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="relative min-w-0">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="truncate text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {message.pseudo}
                    </span>
                    <AccountPopover />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute top-0 left-full ml-4 hidden min-[740px]:block">
              <div className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {message.ratio}
                  <Origami className="size-3.5" aria-hidden="true" />
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground/70 hover:text-muted-foreground"
                  aria-label="Report this message"
                  title="Report this message"
                >
                  <Flag className="size-3" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden min-[740px]:block rounded-md bg-muted/10 py-0 text-sm text-muted-foreground break-words whitespace-pre-wrap leading-relaxed min-h-12 text-left">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MessageCard.displayName = "MessageCard";
