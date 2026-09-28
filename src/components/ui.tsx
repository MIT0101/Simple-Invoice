import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { InvoiceStatus } from "@/db/schema";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:pointer-events-none disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700",
  secondary: "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-zinc-700 hover:bg-zinc-100",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

type ButtonStyleProps = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & ButtonStyleProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

const controlClasses =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(controlClasses, "resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClasses, "pr-8", className)} {...props} />;
}

/** Label + control + error (or hint). Pass the control's id as `htmlFor`. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-lg border border-zinc-200 bg-white p-5 shadow-xs sm:p-6", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold text-zinc-900", className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description ? <div className="mt-1 text-sm text-zinc-600">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const posted = status === "posted";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        posted
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
          : "bg-amber-50 text-amber-800 ring-amber-600/30",
      )}
    >
      {posted ? "Posted" : "Draft"}
    </span>
  );
}

export function Alert({
  tone = "error",
  className,
  ...props
}: ComponentProps<"div"> & { tone?: "error" | "success" | "info" }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-zinc-200 bg-zinc-50 text-zinc-700",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-4 py-3 text-sm", tones[tone], className)}
      {...props}
    />
  );
}
