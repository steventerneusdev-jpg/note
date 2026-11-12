import { Aurora } from "@/components/notes/aurora";
import { AppShell } from "@/components/notes/app-shell";
import { NotesProvider } from "@/components/notes/notes-store";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NOTE.",
    template: "%s · NOTE.",
  },
  description: "Un carnet de notes futuriste, clair et fluide pour capturer vos idées.",
};

const themeScript = `(function(){try{var stored=localStorage.getItem("lumen.theme");var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Aurora />
        <NotesProvider>
          <AppShell>{children}</AppShell>
        </NotesProvider>
      </body>
    </html>
  );
}
