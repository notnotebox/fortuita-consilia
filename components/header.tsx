"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { H1 } from "@/components/typography";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { getUserTag } from "@/lib/user-tag";
import { LogOut, MessageSquare } from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const displayName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const myMessagesHref = session?.user
    ? `/author/${getUserTag(session.user)}`
    : "/";

  return (
    <header className="border-b border-border">
      <div className="mx-auto w-full min-w-[min(90%,1280px)] xl:w-[60%] border-x border-border">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/icon.svg"
                  alt="Fortuita Consilia logo"
                  width={30}
                  height={25}
                  priority
                  className="h-7 w-auto"
                />
                <H1 className="text-2xl lg:text-3xl">Fortuita Consilia</H1>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <Link href={isHomePage ? "/about" : "/"}>
                  {isHomePage ? "About" : "Home"}
                </Link>
              </Button>
              {session?.user ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:cursor-pointer hover:text-foreground"
                      aria-label="Profile menu"
                    >
                      <Avatar size="sm">
                        <AvatarImage
                          src={session.user.image ?? undefined}
                          alt={displayName}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-30 truncate text-sm">
                        {displayName}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-44 p-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-1.5"
                    >
                      <Link
                        href={myMessagesHref}
                        className="inline-flex items-center gap-1.5"
                      >
                        My messages
                        <MessageSquare className="size-3.5" aria-hidden="true" />
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
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    void signIn("discord", {
                      callbackUrl: pathname || "/",
                    })
                  }
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


