"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteAccountButton() {
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const deleteAccount = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const exportResponse = await fetch("/api/account/export", {
        method: "GET",
        cache: "no-store",
      });
      if (!exportResponse.ok) throw new Error("Account export failed");

      const exportBlob = await exportResponse.blob();
      const downloadUrl = URL.createObjectURL(exportBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = "fortuita-consilia-data.json";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(downloadUrl);

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      if (!response.ok) throw new Error("Account deletion failed");
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("The account could not be deleted. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete all my data</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account and data?</DialogTitle>
          <DialogDescription>
            This permanently deletes your account and all messages you published.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isDeleting}>Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => void deleteAccount()} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
