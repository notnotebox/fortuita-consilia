"use client";

import { Button } from "@/components/ui/button";
import { H1 } from "@/components/typography";

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto w-full min-w-[min(90%,1280px)] xl:w-[60%] border-x border-border">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <H1 className="text-2xl lg:text-3xl">Fortuita Consilia</H1>
            <div className="flex items-center gap-2">
              <Button variant="ghost">About</Button>
              <Button variant="outline">Login</Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
