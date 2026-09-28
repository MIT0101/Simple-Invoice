import { Button, Field, Input, Textarea } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { InvoiceItemFormValues } from "@/lib/validation";
import { RequiredLabel } from "./required-label";

export type LineItemField = keyof InvoiceItemFormValues;

export function LineItemFields({
  idPrefix,
  index,
  count,
  item,
  currency,
  amountCents,
  errorFor,
  onFieldChange,
  onMove,
  onRemove,
}: {
  idPrefix: string;
  index: number;
  count: number;
  item: InvoiceItemFormValues;
  currency: string;
  amountCents: number;
  errorFor: (field: LineItemField) => string | undefined;
  onFieldChange: (field: LineItemField, value: string) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  const position = index + 1;
  const fieldId = (field: string) => `${idPrefix}-${field}`;
  const invalid = (field: LineItemField) => (errorFor(field) ? true : undefined);

  return (
    <li className="rounded-md border border-zinc-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-zinc-700">Item {position}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={`Move item ${position} up`}
            title="Move up"
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label={`Move item ${position} down`}
            title="Move down"
          >
            ↓
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={count === 1}
            aria-label={`Remove item ${position}`}
            className="text-red-700 hover:bg-red-50"
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-6">
        <Field
          className="sm:col-span-6"
          label={<RequiredLabel>Service title</RequiredLabel>}
          htmlFor={fieldId("title")}
          error={errorFor("title")}
        >
          <Input
            id={fieldId("title")}
            value={item.title}
            onChange={(event) => onFieldChange("title", event.target.value)}
            aria-invalid={invalid("title")}
            required
            placeholder="e.g. Backend API development"
          />
        </Field>

        <Field
          className="sm:col-span-6"
          label="Description"
          htmlFor={fieldId("description")}
          error={errorFor("description")}
        >
          <Textarea
            id={fieldId("description")}
            rows={2}
            value={item.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            aria-invalid={invalid("description")}
            placeholder="What was delivered in this unit of work"
          />
        </Field>

        <Field
          className="sm:col-span-6"
          label="Work unit PDF link"
          htmlFor={fieldId("workUrl")}
          error={errorFor("workUrl")}
          hint="Optional — Google Drive link to the PDF documenting this unit of work."
        >
          <Input
            id={fieldId("workUrl")}
            type="url"
            inputMode="url"
            autoComplete="off"
            value={item.workUrl}
            onChange={(event) => onFieldChange("workUrl", event.target.value)}
            aria-invalid={invalid("workUrl")}
            placeholder="https://drive.google.com/…"
          />
        </Field>

        <Field
          className="sm:col-span-2"
          label={<RequiredLabel>Quantity</RequiredLabel>}
          htmlFor={fieldId("quantity")}
          error={errorFor("quantity")}
        >
          <Input
            id={fieldId("quantity")}
            inputMode="decimal"
            autoComplete="off"
            value={item.quantity}
            onChange={(event) => onFieldChange("quantity", event.target.value)}
            aria-invalid={invalid("quantity")}
            required
            className="text-right tabular-nums"
          />
        </Field>

        <Field
          className="sm:col-span-2"
          label={<RequiredLabel>Unit price</RequiredLabel>}
          htmlFor={fieldId("unitPrice")}
          error={errorFor("unitPrice")}
        >
          <Input
            id={fieldId("unitPrice")}
            inputMode="decimal"
            autoComplete="off"
            value={item.unitPrice}
            onChange={(event) => onFieldChange("unitPrice", event.target.value)}
            aria-invalid={invalid("unitPrice")}
            required
            placeholder="0.00"
            className="text-right tabular-nums"
          />
        </Field>

        <Field className="sm:col-span-2" label="Amount" htmlFor={fieldId("amount")}>
          <output
            id={fieldId("amount")}
            className="block rounded-md border border-transparent bg-zinc-50 px-3 py-2 text-right text-sm font-medium text-zinc-900 tabular-nums"
          >
            {formatMoney(amountCents, currency)}
          </output>
        </Field>
      </div>
    </li>
  );
}
