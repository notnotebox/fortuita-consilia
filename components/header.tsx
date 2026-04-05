"use client";

import { Button } from "@/components/ui/button";
import { H1 } from "@/components/typography";
import Image from "next/image";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();
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
              <Button variant="ghost">About</Button>
              {session?.user ? (
                <Button variant="outline" onClick={() => void signOut()}>
                  Logout
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => void signIn("discord")}
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
