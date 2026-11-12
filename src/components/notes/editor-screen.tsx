"use client";

import { RichEditor } from "@/components/notes/rich-editor";
import { useNotes, type Collection, type Note } from "@/components/notes/notes-store";
import { countWords, formatNoteDate, normalizeTags } from "@/lib/note-text";
import { cn } from "cn";
import { ChevronDown, Folder, Pin, Plus, Sparkles, Tag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type UpdateNote = (
  id: string,
  patch: Partial<
    Pick<
      Note,
      | "title"
      | "titleHtml"
      | "subtitle"
      | "subtitleHtml"
      | "html"
      | "text"
      | "collectionId"
      | "tags"
    >
  >,
) => void;

export function EditorScreen() {
  const { ready, notes, collections, activeNote, createNote, updateNote, togglePin } = useNotes();

  if (!ready) return <EditorSkeleton />;
  if (!activeNote) return <BlankEditor onCreate={createNote} />;

  const handleCreate = () => {
    const id = createNote();
    if (activeNote.collectionId) updateNote(id, { collectionId: activeNote.collectionId });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pt-4 pb-4 md:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <EditorPane
          key={activeNote.id}
          note={activeNote}
          noteCount={notes.length}
          collections={collections}
          onCreate={handleCreate}
          updateNote={updateNote}
          onTogglePin={togglePin}
        />
      </div>
    </div>
  );
}

function EditorPane({
  note,
  noteCount,
  collections,
  onCreate,
  updateNote,
  onTogglePin,
}: {
  note: Note;
  noteCount: number;
  collections: Collection[];
  onCreate: () => void;
  updateNote: UpdateNote;
  onTogglePin: (id: string) => void;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const tagsRef = useRef(note.tags);
  const words = countWords(note.text);
  const characters = note.text.length;

  useEffect(() => {
    tagsRef.current = note.tags;
  }, [note.tags]);

  const handleContentChange = useCallback(
    (html: string, text: string) => {
      updateNote(note.id, { html, text });
    },
    [note.id, updateNote],
  );

  const handleTitleChange = useCallback(
    (html: string, text: string) => {
      updateNote(note.id, { titleHtml: html, title: text });
    },
    [note.id, updateNote],
  );

  const handleSubtitleChange = useCallback(
    (html: string, text: string) => {
      updateNote(note.id, { subtitleHtml: html, subtitle: text });
    },
    [note.id, updateNote],
  );

  const addTags = useCallback(
    (raw: string) => {
      if (!raw.trim()) return;
      const next = normalizeTags([...tagsRef.current, ...raw.split(",")]);
      if (next.length !== tagsRef.current.length) {
        tagsRef.current = next;
        updateNote(note.id, { tags: next });
      }
      setTagDraft("");
    },
    [note.id, updateNote],
  );

  const removeTag = useCallback(
    (tag: string) => {
      const next = tagsRef.current.filter((entry) => entry !== tag);
      tagsRef.current = next;
      updateNote(note.id, { tags: next });
    },
    [note.id, updateNote],
  );

  return (
    <div className="glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/40 px-4 py-3 dark:border-white/10 md:px-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink-faint uppercase">
          {formatNoteDate(note.createdAt)}
          <span className="mx-2 text-ink-faint/50">·</span>
          {noteCount} note{noteCount > 1 ? "s" : ""}
        </p>

        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-3.5 py-1.5 text-[11.5px] font-medium text-ink-soft transition hover:-translate-y-0.5 hover:text-ink dark:border-white/10 dark:bg-white/5"
        >
          <Plus className="size-3.5" strokeWidth={2.2} />
          Nouvelle note
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/40 px-4 py-2 dark:border-white/10 md:px-5">
        <label
          title={
            collections.length
              ? "Ranger la note dans une collection"
              : "Créez une collection dans le répertoire"
          }
          className="relative flex items-center gap-1.5 rounded-full border border-white/50 bg-white/40 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5"
        >
          <Folder className="size-3.5 shrink-0 text-glow" strokeWidth={1.8} />
          <span className="sr-only">Collection de la note</span>
          <select
            value={note.collectionId ?? ""}
            onChange={(event) =>
              updateNote(note.id, { collectionId: event.target.value || null })
            }
            aria-label="Collection de la note"
            className="max-w-[10rem] cursor-pointer appearance-none bg-transparent pr-5 text-[11px] font-medium text-ink-soft outline-none"
          >
            <option value="">Sans collection</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-2 size-3 text-ink-faint"
            strokeWidth={2}
          />
        </label>

        <span aria-hidden className="mx-0.5 h-5 w-px bg-black/10 dark:bg-white/10" />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 font-mono text-[9px] tracking-[0.16em] text-ink-faint uppercase">
            <Tag className="size-3 text-glow" strokeWidth={1.8} />
            Tags
          </span>

          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-glow/25 bg-glow/10 px-2 py-0.5 text-[10.5px] font-medium text-glow"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Retirer le tag ${tag}`}
                className="rounded-full p-0.5 transition hover:bg-glow/15"
              >
                <X className="size-2.5" strokeWidth={2.2} />
              </button>
            </span>
          ))}

          <input
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTags(tagDraft);
              }
              if (event.key === "Escape") setTagDraft("");
            }}
            onBlur={() => addTags(tagDraft)}
            maxLength={24}
            autoComplete="off"
            placeholder={note.tags.length ? "Ajouter un tag" : "Ajouter un tag ↵"}
            aria-label="Ajouter un tag"
            className="min-w-[7.5rem] flex-1 bg-transparent text-[11.5px] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
      </div>

      <RichEditor
        noteId={note.id}
        initialHtml={note.html}
        titleHtml={note.titleHtml}
        titleText={note.title}
        subtitleHtml={note.subtitleHtml}
        subtitleText={note.subtitle}
        onChange={handleContentChange}
        onTitleChange={handleTitleChange}
        onSubtitleChange={handleSubtitleChange}
        header={
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => onTogglePin(note.id)}
              aria-label={note.pinned ? "Désépingler la note" : "Épingler la note"}
              aria-pressed={note.pinned}
              title={note.pinned ? "Désépingler la note" : "Épingler la note"}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg border transition",
                note.pinned
                  ? "border-glow/40 bg-glow/15 text-glow"
                  : "border-white/60 bg-white/40 text-ink-faint hover:text-ink dark:border-white/10 dark:bg-white/5",
              )}
            >
              <Pin className={cn("size-4", note.pinned && "fill-current")} strokeWidth={1.8} />
            </button>
          </div>
        }
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/40 px-4 py-2.5 font-mono text-[9.5px] tracking-[0.14em] text-ink-faint uppercase dark:border-white/10 md:px-5">
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-3 text-glow" strokeWidth={1.8} />
          sauvegarde automatique · reste sur cet appareil
        </span>
        <span>
          {words} mot{words > 1 ? "s" : ""} · {characters} caractère
          {characters > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function BlankEditor({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pt-10 pb-10 md:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <section className="glass flex flex-col items-center rounded-[30px] px-6 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-glow to-mint text-white shadow-[0_18px_40px_-18px_var(--glow)]">
            <Sparkles className="size-7" strokeWidth={1.6} />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">Une page vous attend</h1>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-soft">
            Créez une note, laissez la barre d&apos;outils façonner votre texte, puis retrouvez tout
            dans le répertoire.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-7 flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-5 py-2.5 text-[13px] font-medium text-ink-soft transition hover:-translate-y-0.5 hover:text-ink dark:border-white/10 dark:bg-white/5"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            Nouvelle note
          </button>
        </section>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pt-4 pb-4 md:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <div className="glass flex min-h-0 flex-1 animate-pulse flex-col rounded-[30px] p-6">
          <div className="h-7 w-40 rounded-full bg-white/50 dark:bg-white/10" />
          <div className="mt-10 h-11 w-2/3 rounded-full bg-white/50 dark:bg-white/10" />
          <div className="mt-4 h-4 w-1/3 rounded-full bg-white/40 dark:bg-white/10" />
          <div className="mt-10 space-y-4">
            {[92, 84, 88, 70, 80, 55].map((width, index) => (
              <div
                key={index}
                className="h-3.5 rounded-full bg-white/40 dark:bg-white/10"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
