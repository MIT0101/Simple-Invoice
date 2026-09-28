"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Alert, Button } from "@/components/ui";
import type { InvoiceStatus } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import {
  deleteInvoiceAction,
  duplicateInvoiceAction,
  postInvoiceAction,
  resetInvoiceToDraftAction,
} from "../actions";

type ActionName = "post" | "reset" | "duplicate" | "delete";

const ACTIONS: Record<ActionName, (id: number) => Promise<ActionResult>> = {
  post: postInvoiceAction,
  reset: resetInvoiceToDraftAction,
  duplicate: duplicateInvoiceAction,
  delete: deleteInvoiceAction,
};

type Confirmation = { question: string; confirmLabel: string; variant: "primary" | "danger" };

/** Actions that need a second click before they run. */
const CONFIRMATIONS: Partial<Record<ActionName, Confirmation>> = {
  post: { question: "Post and lock this invoice?", confirmLabel: "Post invoice", variant: "primary" },
  reset: { question: "Unlock this invoice for editing?", confirmLabel: "Reset to draft", variant: "primary" },
  delete: { question: "Delete this draft permanently?", confirmLabel: "Delete", variant: "danger" },
};

const PENDING_LABELS: Record<ActionName, string> = {
  post: "Posting…",
  reset: "Resetting…",
  duplicate: "Duplicating…",
  delete: "Deleting…",
};

/** `children` (e.g. the Edit and PDF buttons) render before the status actions. */
export function InvoiceActions({
  invoiceId,
  status,
  children,
}: {
  invoiceId: number;
  status: InvoiceStatus;
  children?: ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<ActionName | null>(null);
  const [running, setRunning] = useState<ActionName | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(name: ActionName) {
    setError(null);
    setRunning(name);
    startTransition(async () => {
      // Duplicate and delete redirect on success; post and reset refresh this page.
      const result = await ACTIONS[name](invoiceId);
      if (result && !result.ok) setError(result.message);
      setConfirming(null);
      setRunning(null);
    });
  }

  function request(name: ActionName) {
    setError(null);
    if (CONFIRMATIONS[name]) setConfirming(name);
    else run(name);
  }

  const label = (name: ActionName, text: string) => (running === name ? PENDING_LABELS[name] : text);
  const confirmation = confirming ? CONFIRMATIONS[confirming] : undefined;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {children}
        {confirming && confirmation ? (
          <div
            role="group"
            aria-label="Confirm action"
            className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 py-1 pr-1 pl-3"
          >
            <span className="text-sm text-zinc-800">{confirmation.question}</span>
            <Button
              size="sm"
              variant={confirmation.variant}
              disabled={isPending}
              onClick={() => run(confirming)}
            >
              {label(confirming, confirmation.confirmLabel)}
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" disabled={isPending} onClick={() => request("duplicate")}>
              {label("duplicate", "Duplicate")}
            </Button>
            {status === "draft" ? (
              <>
                <Button variant="danger" disabled={isPending} onClick={() => request("delete")}>
                  Delete
                </Button>
                <Button disabled={isPending} onClick={() => request("post")}>
                  Post invoice
                </Button>
              </>
            ) : (
              <Button variant="secondary" disabled={isPending} onClick={() => request("reset")}>
                Reset to draft
              </Button>
            )}
          </>
        )}
      </div>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
