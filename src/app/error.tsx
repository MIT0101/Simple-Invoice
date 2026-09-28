"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";
import { routes } from "@/lib/routes";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-600">The page could not be loaded. Please try again.</p>
      {error.digest ? <p className="mt-1 text-xs text-zinc-400">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <ButtonLink href={routes.invoices}>Back to invoices</ButtonLink>
      </div>
    </div>
  );
}
