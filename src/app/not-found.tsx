import { ButtonLink } from "@/components/ui";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-2 text-sm text-zinc-600">The page or invoice you are looking for does not exist.</p>
      <ButtonLink href={routes.invoices} className="mt-6">
        Back to invoices
      </ButtonLink>
    </div>
  );
}
