import { EditorScreen } from "@/components/notes/editor-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Écrire",
};

export default function EditorPage() {
  return <EditorScreen />;
}
