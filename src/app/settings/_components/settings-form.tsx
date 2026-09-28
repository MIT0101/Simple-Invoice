"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { Alert, Button, Card, CardTitle, Field, Input, Select, Textarea } from "@/components/ui";
import type { ActionResult } from "@/lib/action-result";
import { COMMON_CURRENCIES } from "@/lib/currencies";
import { MAX_SIGNATURE_BYTES, SIGNATURE_MIME_TYPES } from "@/lib/signature";
import type { SettingsFormValues } from "@/lib/validation";
import { saveSettingsAction } from "../actions";

export type SettingsFormInitial = {
  /** Changes on every save; used to remount the fields so they show the saved values. */
  version: number;
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  paymentDetails: string;
  currency: string;
  invoicePrefix: string;
  paymentTermsDays: number;
  signatureImage: string | null;
};

type FieldErrors = Record<string, string>;

const fieldId = (name: string) => `settings-${name}`;

export function SettingsForm({ initial }: { initial: SettingsFormInitial }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    saveSettingsAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors: FieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (state && !state.ok) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  // Not the `action` prop: React resets `action` forms after submit, wiping input on validation errors.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <SettingsFields key={initial.version} initial={initial} errors={errors} />

      {state ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message ?? "Settings saved."}</Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

function SettingsFields({ initial, errors }: { initial: SettingsFormInitial; errors: FieldErrors }) {
  const commonCurrencies: readonly string[] = COMMON_CURRENCIES;
  const currencies = commonCurrencies.includes(initial.currency)
    ? commonCurrencies
    : [initial.currency, ...commonCurrencies];

  return (
    <>
      <Card>
        <CardTitle>Your details</CardTitle>
        <p className="mt-1 text-sm text-zinc-600">Shown in the “From” section of every invoice.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextField
            name="fullName"
            label={
              <>
                Full name <span className="text-red-600">*</span>
              </>
            }
            defaultValue={initial.fullName}
            error={errors.fullName}
            required
            maxLength={120}
            autoComplete="name"
          />
          <TextField
            name="jobTitle"
            label="Professional title"
            defaultValue={initial.jobTitle}
            error={errors.jobTitle}
            maxLength={120}
            placeholder="Software Engineer & Consultant"
            autoComplete="organization-title"
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            defaultValue={initial.email}
            error={errors.email}
            maxLength={200}
            autoComplete="email"
          />
          <TextField
            name="phone"
            label="Phone"
            type="tel"
            defaultValue={initial.phone}
            error={errors.phone}
            maxLength={50}
            autoComplete="tel"
          />
          <Field
            label="Address"
            htmlFor={fieldId("address")}
            error={errors.address}
            className="sm:col-span-2"
          >
            <Textarea
              id={fieldId("address")}
              name="address"
              rows={3}
              defaultValue={initial.address}
              maxLength={500}
              autoComplete="street-address"
              aria-invalid={errors.address ? true : undefined}
            />
          </Field>
          <TextField
            name="website"
            label="Website / LinkedIn"
            defaultValue={initial.website}
            error={errors.website}
            maxLength={200}
            inputMode="url"
            autoComplete="url"
            placeholder="linkedin.com/in/your-name"
            className="sm:col-span-2"
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Payment details</CardTitle>
        <div className="mt-5">
          <Field
            label="How clients can pay you"
            htmlFor={fieldId("paymentDetails")}
            error={errors.paymentDetails}
            hint="Printed on every invoice. Leave empty to hide."
          >
            <Textarea
              id={fieldId("paymentDetails")}
              name="paymentDetails"
              rows={5}
              defaultValue={initial.paymentDetails}
              maxLength={1000}
              placeholder="Bank name, account holder, IBAN, SWIFT/BIC, PayPal…"
              aria-invalid={errors.paymentDetails ? true : undefined}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Signature</CardTitle>
        <p className="mt-1 text-sm text-zinc-600">Printed at the bottom of every invoice.</p>
        <div className="mt-5">
          <SignatureField current={initial.signatureImage} error={errors.signature} />
        </div>
      </Card>

      <Card>
        <CardTitle>Invoice defaults</CardTitle>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field
            label="Default currency"
            htmlFor={fieldId("currency")}
            error={errors.currency}
            hint="Pre-selected on new invoices."
          >
            <Select
              id={fieldId("currency")}
              name="currency"
              defaultValue={initial.currency}
              aria-invalid={errors.currency ? true : undefined}
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
          <TextField
            name="invoicePrefix"
            label="Invoice number prefix"
            defaultValue={initial.invoicePrefix}
            error={errors.invoicePrefix}
            hint='e.g. "INV-" gives INV-2026-0001. Applies to invoices posted from now on.'
            maxLength={20}
            spellCheck={false}
            autoComplete="off"
          />
          <TextField
            name="paymentTermsDays"
            label="Payment terms (days)"
            type="number"
            defaultValue={initial.paymentTermsDays}
            error={errors.paymentTermsDays}
            hint="Used to pre-fill the due date. 0 = no due date."
            min={0}
            max={365}
            step={1}
            inputMode="numeric"
          />
        </div>
      </Card>
    </>
  );
}

function TextField({
  name,
  label,
  error,
  hint,
  className,
  ...inputProps
}: {
  name: keyof SettingsFormValues;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
} & Omit<ComponentProps<"input">, "name" | "id" | "className">) {
  return (
    <Field label={label} htmlFor={fieldId(name)} error={error} hint={hint} className={className}>
      <Input id={fieldId(name)} name={name} aria-invalid={error ? true : undefined} {...inputProps} />
    </Field>
  );
}

/** Quick client-side check so oversized files never hit the request size limit. */
function checkSignatureFile(file: File): string | null {
  const acceptedTypes: readonly string[] = SIGNATURE_MIME_TYPES;
  if (file.type && !acceptedTypes.includes(file.type)) return "Choose a PNG or JPEG image.";
  if (file.size > MAX_SIGNATURE_BYTES) return "The signature image must be 1 MB or smaller.";
  return null;
}

function SignatureField({ current, error }: { current: string | null; error?: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setFileError(null);
    setPreviewUrl(null);
    if (!file) return;

    const problem = checkSignatureFile(file);
    if (problem) {
      setFileError(problem);
      input.value = "";
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  const shownImage = previewUrl ?? (remove ? null : current);
  const errorMessage = fileError ?? error;

  return (
    <Field
      label="Signature image"
      htmlFor={fieldId("signature")}
      error={errorMessage}
      hint="PNG with a transparent background works best. Max 1 MB."
    >
      <div className="flex min-h-28 items-center justify-center rounded-md border border-zinc-200 bg-white p-4">
        {shownImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- data:/blob: URL preview, nothing to optimise
          <img
            src={shownImage}
            alt={previewUrl ? "New signature preview" : "Current signature"}
            className="max-h-24 w-auto object-contain"
          />
        ) : (
          <p className="text-sm text-zinc-500">
            {remove ? "The signature will be removed when you save." : "No signature uploaded yet."}
          </p>
        )}
      </div>
      {previewUrl ? (
        <p className="text-xs text-zinc-500">New image selected. It replaces the current one when you save.</p>
      ) : null}
      <input
        id={fieldId("signature")}
        name="signature"
        type="file"
        accept="image/png,image/jpeg"
        disabled={remove}
        onChange={handleFileChange}
        aria-invalid={errorMessage ? true : undefined}
        className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 disabled:opacity-50"
      />
      {current && !previewUrl ? (
        <label className="flex w-fit items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="removeSignature"
            checked={remove}
            onChange={(event) => setRemove(event.currentTarget.checked)}
            className="size-4 rounded border-zinc-300 accent-zinc-900"
          />
          Remove signature
        </label>
      ) : null}
    </Field>
  );
}
