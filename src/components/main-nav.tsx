"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import { routes } from "@/lib/routes";

const links = [
  { href: routes.invoices, label: "Invoices" },
  { href: routes.settings, label: "Settings" },
];

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:text-zinc-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
