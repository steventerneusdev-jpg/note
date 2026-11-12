import { GalleryScreen } from "@/components/notes/gallery-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Répertoire",
};

export default function NotesPage() {
  return <GalleryScreen />;
}
