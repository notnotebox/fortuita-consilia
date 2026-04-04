"use client";

import { Button } from "@/components/ui/button";
import { H1 } from "@/components/typography";

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto w-full min-w-[min(90%,1280px)] xl:w-[60%] border-x border-border">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg
                className="h-7 w-auto"
                viewBox="0 0 377 327"
                role="img"
                aria-label="Fortuita Consilia"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M188.297 8.41992C190.617 37.2194 201.472 99.6707 249.162 182.272C296.856 264.881 345.518 305.507 369.297 321.913C343.199 309.523 283.686 287.694 188.297 287.694C92.9082 287.694 33.3944 309.523 7.29688 321.913C31.076 305.507 79.7382 264.882 127.433 182.272C175.123 99.6708 185.977 37.2196 188.297 8.41992Z"
                  fill="#D9D9D9"
                  stroke="white"
                />
              </svg>
              <H1 className="text-2xl lg:text-3xl">Fortuita Consilia</H1>
            </div>
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
