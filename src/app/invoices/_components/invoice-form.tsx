"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardTitle,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { COMMON_CURRENCIES } from "@/lib/currencies";
import { emptyLineItem } from "@/lib/invoice-form";
import { formatMoney, lineAmountCents, parseMoneyToCents, parseQuantity } from "@/lib/money";
import type { InvoiceFormValues, InvoiceItemFormValues } from "@/lib/validation";
import { saveInvoiceAction } from "../actions";
import { LineItemFields, type LineItemField } from "./line-item-fields";
import { RequiredLabel } from "./required-label";

type InvoiceField = Exclude<keyof InvoiceFormValues, "items">;
type FieldErrors = Record<string, string>;

/** Live preview amount; incomplete or invalid inputs count as 0 (the server re-validates). */
function previewAmountCents(item: InvoiceItemFormValues): number {
  const quantity = parseQuantity(item.quantity);
  const unitPriceCents = parseMoneyToCents(item.unitPrice);
  return quantity === null || unitPriceCents === null ? 0 : lineAmountCents(quantity, unitPriceCents);
}

function moveEntry<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry);
  return next;
}

export function InvoiceForm({
  invoiceId,
  initialValues,
  cancelHref,
}: {
  /** null creates a new draft. */
  invoiceId: number | null;
  initialValues: InvoiceFormValues;
  cancelHref: string;
}) {
  const id = useId();
  const [values, setValues] = useState(initialValues);
  // Client-only keys keep each item's inputs stable while items are added, removed or reordered.
  const [itemKeys, setItemKeys] = useState(() => initialValues.items.map((_, index) => index));
  const nextItemKey = useRef(initialValues.items.length);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const revealErrors = useRef(false);

  // After a failed save, bring the first problem into view.
  useEffect(() => {
    if (!revealErrors.current) return;
    revealErrors.current = false;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    else alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errors, formError]);

  function clearErrors(matches: (field: string) => boolean) {
    setErrors((current) => {
      const remaining = Object.entries(current).filter(([field]) => !matches(field));
      return remaining.length === Object.keys(current).length ? current : Object.fromEntries(remaining);
    });
  }

  function setField(name: InvoiceField, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    clearErrors((field) => field === name);
  }

  function setItemField(index: number, name: LineItemField, value: string) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, [name]: value } : item)),
    }));
    clearErrors((field) => field === `items.${index}.${name}`);
  }

  function addItem() {
    const key = nextItemKey.current++;
    setValues((current) => ({ ...current, items: [...current.items, emptyLineItem()] }));
    setItemKeys((keys) => [...keys, key]);
    clearErrors((field) => field === "items");
  }

  // Server errors are index-based, so they no longer line up after a remove or move.
  function removeItem(index: number) {
    setValues((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
    setItemKeys((keys) => keys.filter((_, i) => i !== index));
    clearErrors((field) => field.startsWith("items"));
  }

  function moveItem(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= values.items.length) return;
    setValues((current) => ({ ...current, items: moveEntry(current.items, index, target) }));
    setItemKeys((keys) => moveEntry(keys, index, target));
    clearErrors((field) => field.startsWith("items"));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      // On success the action redirects to the invoice page.
      const result = await saveInvoiceAction(invoiceId, values);
      if (result && !result.ok) {
        revealErrors.current = true;
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    });
  }

  const fieldId = (name: string) => `${id}-${name}`;
  const invalid = (name: string) => (errors[name] ? true : undefined);
  const currencies: readonly string[] = (COMMON_CURRENCIES as readonly string[]).includes(values.currency)
    ? COMMON_CURRENCIES
    : [values.currency, ...COMMON_CURRENCIES];
  const totalCents = values.items.reduce((sum, item) => sum + previewAmountCents(item), 0);

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError ? <Alert ref={alertRef}>{formError}</Alert> : null}

      <Card>
        <CardTitle>Client</CardTitle>
        <div className="mt-4 grid gap-4">
          <Field
            label={<RequiredLabel>Client name</RequiredLabel>}
            htmlFor={fieldId("clientName")}
            error={errors.clientName}
          >
            <Input
              id={fieldId("clientName")}
              value={values.clientName}
              onChange={(event) => setField("clientName", event.target.value)}
              aria-invalid={invalid("clientName")}
              required
              autoComplete="organization"
            />
          </Field>
          <Field
            label="Client details"
            htmlFor={fieldId("clientDetails")}
            error={errors.clientDetails}
            hint="Printed under the client name on the invoice."
          >
            <Textarea
              id={fieldId("clientDetails")}
              rows={3}
              value={values.clientDetails}
              onChange={(event) => setField("clientDetails", event.target.value)}
              aria-invalid={invalid("clientDetails")}
              placeholder="Company address, contact person, email, tax number…"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Invoice details</CardTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field
            label={<RequiredLabel>Issue date</RequiredLabel>}
            htmlFor={fieldId("issueDate")}
            error={errors.issueDate}
          >
            <Input
              id={fieldId("issueDate")}
              type="date"
              value={values.issueDate}
              onChange={(event) => setField("issueDate", event.target.value)}
              aria-invalid={invalid("issueDate")}
              required
            />
          </Field>
          <Field label="Due date" htmlFor={fieldId("dueDate")} error={errors.dueDate} hint="Optional">
            <Input
              id={fieldId("dueDate")}
              type="date"
              min={values.issueDate || undefined}
              value={values.dueDate}
              onChange={(event) => setField("dueDate", event.target.value)}
              aria-invalid={invalid("dueDate")}
            />
          </Field>
          <Field label="Currency" htmlFor={fieldId("currency")} error={errors.currency}>
            <Select
              id={fieldId("currency")}
              value={values.currency}
              onChange={(event) => setField("currency", event.target.value)}
              aria-invalid={invalid("currency")}
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Completed work</CardTitle>
        <Field
          className="mt-4"
          label="Summary"
          htmlFor={fieldId("summary")}
          error={errors.summary}
          hint="Short points, one per line — shown as a bulleted list on the invoice."
        >
          <Textarea
            id={fieldId("summary")}
            rows={4}
            value={values.summary}
            onChange={(event) => setField("summary", event.target.value)}
            aria-invalid={invalid("summary")}
            placeholder={"Built the reporting dashboard\nIntegrated the payment gateway"}
          />
        </Field>
      </Card>

      <Card>
        <CardTitle>Line items</CardTitle>
        <p className="mt-1 text-sm text-zinc-600">
          One line per unit of work: a short service title, a description and a link to its PDF.
        </p>
        {errors.items ? <p className="mt-3 text-sm text-red-600">{errors.items}</p> : null}

        <ol className="mt-4 space-y-4">
          {values.items.map((item, index) => (
            <LineItemFields
              key={itemKeys[index]}
              idPrefix={`${id}-item-${itemKeys[index]}`}
              index={index}
              count={values.items.length}
              item={item}
              currency={values.currency}
              amountCents={previewAmountCents(item)}
              errorFor={(field) => errors[`items.${index}.${field}`]}
              onFieldChange={(field, value) => setItemField(index, field, value)}
              onMove={(offset) => moveItem(index, offset)}
              onRemove={() => removeItem(index)}
            />
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-4">
          <Button variant="secondary" onClick={addItem}>
            Add line item
          </Button>
          <p className="text-sm text-zinc-600">
            Total
            <span className="ml-3 text-lg font-semibold text-zinc-900 tabular-nums">
              {formatMoney(totalCents, values.currency)}
            </span>
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>Notes</CardTitle>
        <Field
          className="mt-4"
          label="Notes for the client"
          htmlFor={fieldId("notes")}
          error={errors.notes}
          hint="Optional — e.g. a thank-you note or reference numbers."
        >
          <Textarea
            id={fieldId("notes")}
            rows={3}
            value={values.notes}
            onChange={(event) => setField("notes", event.target.value)}
            aria-invalid={invalid("notes")}
          />
        </Field>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <ButtonLink href={cancelHref}>Cancel</ButtonLink>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
