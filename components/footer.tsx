"use client";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-screen-xl border-x border-border">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Fortuita Consilia. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span>Legal</span>
              <span>Privacy</span>
              <span>Contact</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
