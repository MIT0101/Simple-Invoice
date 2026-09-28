import type { ReactNode } from "react";

export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <span aria-hidden="true" className="ml-0.5 text-red-600">
        *
      </span>
    </>
  );
}
