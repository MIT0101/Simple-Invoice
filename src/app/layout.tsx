import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { routes } from "@/lib/routes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Invoices", template: "%s · Invoices" },
  description: "Create, post, print and download freelance invoices.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href={routes.invoices} className="text-sm font-semibold tracking-tight">
              Invoice Generator
            </Link>
            <MainNav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
