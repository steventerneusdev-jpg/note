"use client";

import { Moon, Sun } from "lucide-react";

const THEME_KEY = "lumen.theme";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextDark = !root.classList.contains("dark");
    root.classList.toggle("dark", nextDark);
    root.style.colorScheme = nextDark ? "dark" : "light";

    try {
      window.localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
    } catch {
      // Le thème reste appliqué pour la session en cours.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Basculer entre le thème clair et le thème sombre"
      title="Thème clair / sombre"
      className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/55 text-ink-soft transition hover:-translate-y-0.5 hover:text-ink active:translate-y-0 dark:border-white/10 dark:bg-white/5"
    >
      <Moon className="size-4 dark:hidden" strokeWidth={1.7} />
      <Sun className="hidden size-4 dark:block" strokeWidth={1.7} />
    </button>
  );
}
