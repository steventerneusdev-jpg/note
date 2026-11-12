"use client";

import { ThemeToggle } from "@/components/notes/theme-toggle";
import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Écrire" },
  { href: "/notes", label: "Répertoire" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
        <div className="glass mx-auto flex w-full max-w-6xl items-center justify-between gap-2 rounded-2xl px-3 py-2.5 md:px-4">
          <Link href="/" aria-label="NOTE. — Accueil" className="rounded-xl px-1 py-1">
            <span className="text-[20px] leading-none font-bold tracking-[-0.05em] text-ink">
              NOTE<span className="text-glow">.</span>
            </span>
          </Link>

          <nav
            aria-label="Navigation principale"
            className="glass-thin flex items-center gap-1 rounded-full p-1"
          >
            {links.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition",
                    active
                      ? "bg-glow text-white shadow-[0_8px_18px_-12px_var(--glow)]"
                      : "text-ink-soft hover:bg-white/50 hover:text-ink dark:hover:bg-white/10",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <ThemeToggle />
        </div>
      </header>

      <main className="editor-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
