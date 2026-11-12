"use client";

import {
  useNotes,
  type Collection,
  type Note,
} from "@/components/notes/notes-store";
import { countWords, excerpt, formatRelativeDate } from "@/lib/note-text";
import { cn } from "cn";
import {
  ArrowRight,
  Folder,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function GalleryScreen() {
  const {
    ready,
    notes,
    collections,
    createNote,
    selectNote,
    updateNote,
    togglePin,
    deleteNote,
    restoreNote,
    createCollection,
    renameCollection,
    deleteCollection,
  } = useNotes();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [collectionDraft, setCollectionDraft] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState("");
  const [confirmCollectionId, setConfirmCollectionId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<Note | null>(null);

  useEffect(() => {
    if (!deleted) return;
    const timeout = window.setTimeout(() => setDeleted(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [deleted]);

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      if (note.collectionId) {
        counts.set(note.collectionId, (counts.get(note.collectionId) ?? 0) + 1);
      }
    }
    return counts;
  }, [notes]);

  const uncategorizedCount = useMemo(
    () => notes.filter((note) => !note.collectionId).length,
    [notes],
  );

  const visibleNotes = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/^#+/, "");

    return [...notes]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
      .filter((note) => {
        if (collectionFilter === "none" && note.collectionId) return false;
        if (
          collectionFilter !== "all" &&
          collectionFilter !== "none" &&
          note.collectionId !== collectionFilter
        ) {
          return false;
        }

        if (tagFilter && !note.tags.includes(tagFilter)) return false;
        if (!needle) return true;

        const collectionName =
          collections.find((collection) => collection.id === note.collectionId)?.name ?? "";
        return `${note.title} ${note.subtitle} ${note.text} ${note.tags.join(" ")} ${collectionName}`
          .toLowerCase()
          .includes(needle);
      });
  }, [collectionFilter, collections, notes, query, tagFilter]);

  const activeCollection =
    collectionFilter !== "all" && collectionFilter !== "none"
      ? collections.find((collection) => collection.id === collectionFilter)
      : undefined;

  const hasFilters = Boolean(query.trim()) || collectionFilter !== "all" || Boolean(tagFilter);

  function openNote(id: string) {
    selectNote(id);
    router.push("/");
  }

  function startNote() {
    const id = createNote();
    if (collectionFilter !== "all" && collectionFilter !== "none") {
      updateNote(id, { collectionId: collectionFilter });
    }
    setQuery("");
    setTagFilter(null);
    router.push("/");
  }

  function removeNote(note: Note) {
    deleteNote(note.id);
    setDeleted(note);
    setConfirmId(null);
  }

  function selectCollection(filter: string) {
    setCollectionFilter(filter);
    setConfirmCollectionId(null);
    setEditingCollectionId(null);
    setEditingCollectionName("");
  }

  function resetFilters() {
    setQuery("");
    selectCollection("all");
    setTagFilter(null);
  }

  function addCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = createCollection(collectionDraft);
    if (!id) return;
    setCollectionDraft("");
    selectCollection(id);
  }

  function startRename(collection: Collection) {
    setEditingCollectionId(collection.id);
    setEditingCollectionName(collection.name);
    setConfirmCollectionId(null);
  }

  function submitRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingCollectionId) renameCollection(editingCollectionId, editingCollectionName);
    setEditingCollectionId(null);
    setEditingCollectionName("");
  }

  function removeCollection(id: string) {
    deleteCollection(id);
    if (collectionFilter === id) selectCollection("all");
    setConfirmCollectionId(null);
    setEditingCollectionId(null);
  }

  if (!ready) return <GallerySkeleton />;

  const hasNotes = notes.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pt-4 pb-16 md:px-6">
      <section className="glass relative overflow-hidden rounded-[30px] p-5 md:p-8">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
        />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] tracking-[0.32em] text-ink-faint uppercase">
              Répertoire
            </p>
            <h1 className="mt-2.5 text-[clamp(1.9rem,4.6vw,2.8rem)] leading-[1.05] font-semibold tracking-[-0.045em]">
              Toutes vos notes<span className="text-glow">.</span>
            </h1>
            <p className="mt-2.5 max-w-md text-[13.5px] leading-relaxed text-ink-soft">
              Une galerie pour retrouver chaque idée, rouvrir une note et continuer à écrire.
            </p>
          </div>

          <button
            type="button"
            onClick={startNote}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-glow to-mint px-4.5 py-2.5 text-[12.5px] font-medium text-white shadow-[0_16px_32px_-18px_var(--glow)] transition hover:brightness-110 active:translate-y-px"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            Nouvelle note
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-ink-faint transition focus-within:border-glow/40 focus-within:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:focus-within:bg-white/10">
            <Search className="size-4 shrink-0" strokeWidth={1.7} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un titre, un sous-titre, un tag…"
              aria-label="Rechercher dans les notes"
              className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="shrink-0 rounded-full p-0.5 text-ink-faint transition hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {tagFilter ? (
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-glow/30 bg-glow/10 px-3 py-1.5 text-[11px] font-medium text-glow"
              title="Retirer le filtre par tag"
            >
              <Tag className="size-3" strokeWidth={1.9} />#{tagFilter}
              <X className="size-3" strokeWidth={2.2} />
            </button>
          ) : null}

          <span className="rounded-full border border-white/50 bg-white/40 px-3 py-1.5 font-mono text-[9.5px] tracking-[0.16em] text-ink-faint uppercase dark:border-white/10 dark:bg-white/5">
            {hasFilters
              ? `${visibleNotes.length} résultat${visibleNotes.length > 1 ? "s" : ""}`
              : `${notes.length} note${notes.length > 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/40 pt-4 dark:border-white/10">
          <span className="mr-1 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-ink-faint uppercase">
            <Folder className="size-3 text-glow" strokeWidth={1.8} />
            Collections
          </span>

          <button
            type="button"
            onClick={() => selectCollection("all")}
            className={collectionChipClass(collectionFilter === "all")}
          >
            Toutes
            <span className="text-[8.5px] opacity-60">{notes.length}</span>
          </button>

          <button
            type="button"
            onClick={() => selectCollection("none")}
            className={collectionChipClass(collectionFilter === "none")}
          >
            Sans collection
            <span className="text-[8.5px] opacity-60">{uncategorizedCount}</span>
          </button>

          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => selectCollection(collection.id)}
              className={collectionChipClass(collectionFilter === collection.id)}
            >
              <Folder className="size-3" strokeWidth={1.8} />
              {collection.name}
              <span className="text-[8.5px] opacity-60">
                {collectionCounts.get(collection.id) ?? 0}
              </span>
            </button>
          ))}

          <form
            onSubmit={addCollection}
            className="flex min-w-[12rem] flex-1 items-center gap-1.5 rounded-xl border border-white/60 bg-white/45 px-2 py-1.5 transition focus-within:border-glow/40 dark:border-white/10 dark:bg-white/5 md:ml-auto md:max-w-xs"
          >
            <Folder className="size-3.5 shrink-0 text-glow" strokeWidth={1.8} />
            <input
              value={collectionDraft}
              onChange={(event) => setCollectionDraft(event.target.value)}
              placeholder="Nouvelle collection"
              aria-label="Nom de la nouvelle collection"
              maxLength={40}
              className="min-w-0 flex-1 bg-transparent text-[11.5px] text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              type="submit"
              aria-label="Créer la collection"
              title="Créer la collection"
              className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-glow/15 text-glow transition hover:bg-glow/25"
            >
              <Plus className="size-3.5" strokeWidth={2.2} />
            </button>
          </form>
        </div>

        {activeCollection ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/50 bg-white/30 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            {editingCollectionId === activeCollection.id ? (
              <form onSubmit={submitRename} className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  value={editingCollectionName}
                  onChange={(event) => setEditingCollectionName(event.target.value)}
                  aria-label="Nouveau nom de la collection"
                  autoFocus
                  maxLength={40}
                  className="min-w-0 flex-1 rounded-lg border border-glow/30 bg-white/50 px-2 py-1 text-[11.5px] text-ink outline-none dark:bg-white/10"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-glow px-2.5 py-1 text-[10.5px] font-medium text-white transition hover:brightness-110"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCollectionId(null);
                    setEditingCollectionName("");
                  }}
                  className="rounded-lg px-2 py-1 text-[10.5px] font-medium text-ink-faint transition hover:text-ink"
                >
                  Annuler
                </button>
              </form>
            ) : confirmCollectionId === activeCollection.id ? (
              <>
                <span className="min-w-0 flex-1 text-[11px] text-ink-soft">
                  Supprimer «&nbsp;{activeCollection.name}&nbsp;» ? Les notes seront conservées
                  sans collection.
                </span>
                <button
                  type="button"
                  onClick={() => removeCollection(activeCollection.id)}
                  className="rounded-lg bg-rose-500 px-2.5 py-1 text-[10.5px] font-medium text-white transition hover:bg-rose-600"
                >
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCollectionId(null)}
                  className="rounded-lg px-2 py-1 text-[10.5px] font-medium text-ink-faint transition hover:text-ink"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <span className="mr-auto font-mono text-[9px] tracking-[0.14em] text-ink-faint uppercase">
                  Collection « {activeCollection.name} »
                </span>
                <button
                  type="button"
                  onClick={() => startRename(activeCollection)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] font-medium text-ink-soft transition hover:bg-white/50 hover:text-ink dark:hover:bg-white/10"
                >
                  <Pencil className="size-3" strokeWidth={1.9} />
                  Renommer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCollectionId(activeCollection.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] font-medium text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <Trash2 className="size-3" strokeWidth={1.9} />
                  Supprimer
                </button>
              </>
            )}
          </div>
        ) : null}
      </section>

      {hasNotes && visibleNotes.length > 0 ? (
        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              collection={collections.find((collection) => collection.id === note.collectionId)}
              confirming={confirmId === note.id}
              onOpen={() => openNote(note.id)}
              onPin={() => togglePin(note.id)}
              onTagClick={(tag) => setTagFilter(tag)}
              onCollectionClick={selectCollection}
              onRequestDelete={() => setConfirmId(note.id)}
              onCancelDelete={() => setConfirmId(null)}
              onConfirmDelete={() => removeNote(note)}
            />
          ))}
        </div>
      ) : hasNotes ? (
        <section className="glass mt-3.5 flex flex-col items-center rounded-[30px] px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-ink-faint dark:border-white/10 dark:bg-white/5">
            <Search className="size-5" strokeWidth={1.7} />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">
            Aucune note ne correspond
          </h2>
          <p className="mt-2 text-[13px] text-ink-soft">
            Essayez un autre mot-clé, une autre collection ou retirez le tag actif.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 rounded-full border border-white/60 bg-white/55 px-4 py-2 text-[12px] font-medium text-ink transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5"
          >
            Réinitialiser les filtres
          </button>
        </section>
      ) : (
        <section className="glass mt-3.5 flex flex-col items-center rounded-[30px] px-6 py-20 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-glow to-mint text-white shadow-[0_18px_40px_-18px_var(--glow)]">
            <Sparkles className="size-7" strokeWidth={1.6} />
          </span>
          <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">Le répertoire est vide</h2>
          <p className="mt-2.5 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
            Votre première note est à une phrase d&apos;ici. Elle apparaîtra ici, prête à être
            rouverte.
          </p>
          <button
            type="button"
            onClick={startNote}
            className="mt-7 flex items-center gap-2 rounded-full bg-gradient-to-r from-glow to-mint px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_14px_30px_-16px_var(--glow)] transition hover:brightness-110 active:translate-y-px"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            Créer une note
          </button>
        </section>
      )}

      {deleted ? (
        <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-3">
          <div
            role="status"
            className="glass flex max-w-full items-center gap-3 rounded-full px-4 py-2.5 text-[12.5px]"
          >
            <span className="truncate text-ink-soft">
              « {deleted.title.trim() || "Sans titre"} » supprimée
            </span>
            <button
              type="button"
              onClick={() => {
                restoreNote(deleted);
                setDeleted(null);
              }}
              className="shrink-0 rounded-full bg-glow/15 px-3 py-1 text-[11px] font-medium text-glow"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => setDeleted(null)}
              aria-label="Fermer"
              className="shrink-0 text-ink-faint transition hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function collectionChipClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition",
    active
      ? "border-glow/40 bg-glow/15 text-glow"
      : "border-white/50 bg-white/40 text-ink-soft hover:border-glow/25 hover:text-ink dark:border-white/10 dark:bg-white/5",
  );
}

function NoteCard({
  note,
  collection,
  confirming,
  onOpen,
  onPin,
  onTagClick,
  onCollectionClick,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  note: Note;
  collection?: Collection;
  confirming: boolean;
  onOpen: () => void;
  onPin: () => void;
  onTagClick: (tag: string) => void;
  onCollectionClick: (id: string) => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const words = countWords(note.text);
  const preview = excerpt(note.text);
  const subtitle = note.subtitle.trim();

  return (
    <article className="glass group relative flex min-h-[236px] flex-col overflow-hidden rounded-[26px] p-5 transition duration-300 hover:-translate-y-1 hover:border-glow/30">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-glow/20 opacity-0 blur-3xl transition duration-500 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-2">
        <span className="font-mono text-[9px] tracking-[0.2em] text-ink-faint uppercase">
          {formatRelativeDate(note.updatedAt)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPin}
            aria-label={note.pinned ? "Désépingler la note" : "Épingler la note"}
            aria-pressed={note.pinned}
            title={note.pinned ? "Désépingler" : "Épingler"}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg transition",
              note.pinned
                ? "bg-glow/15 text-glow"
                : "text-ink-faint hover:bg-white/60 hover:text-ink dark:hover:bg-white/10",
            )}
          >
            <Pin className={cn("size-3.5", note.pinned && "fill-current")} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onRequestDelete}
            aria-label="Supprimer la note"
            title="Supprimer"
            className="flex size-7 items-center justify-center rounded-lg text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-500"
          >
            <Trash2 className="size-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {collection || note.tags.length ? (
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
          {collection ? (
            <button
              type="button"
              onClick={() => onCollectionClick(collection.id)}
              className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/35 px-2 py-0.5 font-mono text-[9px] tracking-[0.08em] text-ink-soft transition hover:border-glow/30 hover:text-glow dark:border-white/10 dark:bg-white/5"
            >
              <Folder className="size-2.5" strokeWidth={1.9} />
              {collection.name}
            </button>
          ) : null}

          {note.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="rounded-full border border-glow/25 bg-glow/10 px-2 py-0.5 font-mono text-[9px] text-glow transition hover:bg-glow/20"
            >
              #{tag}
            </button>
          ))}
        </div>
      ) : null}

      <button type="button" onClick={onOpen} className="relative mt-4 flex flex-1 flex-col text-left">
        <h2 className="line-clamp-2 text-[19px] leading-snug font-semibold tracking-[-0.025em] text-ink">
          {note.title.trim() || "Sans titre"}
        </h2>
        {subtitle ? (
          <p className="mt-1 line-clamp-1 text-[11.5px] font-medium text-glow">{subtitle}</p>
        ) : null}
        <p className="mt-2.5 line-clamp-4 text-[13px] leading-relaxed text-ink-soft">
          {preview || "Note vide — cliquez pour commencer à écrire."}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-mono text-[9.5px] tracking-[0.18em] text-glow uppercase opacity-0 transition group-hover:opacity-100">
          Ouvrir
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </span>
      </button>

      <div className="relative mt-4 flex items-center justify-between border-t border-white/40 pt-3 font-mono text-[9px] tracking-[0.16em] text-ink-faint uppercase dark:border-white/10">
        <span>
          {words} mot{words > 1 ? "s" : ""}
        </span>
        <span className={cn(note.pinned && "text-glow")}>
          {note.pinned ? "épinglée" : "modifiée"}
        </span>
      </div>

      {confirming ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-[26px] bg-white/80 px-6 text-center backdrop-blur-md dark:bg-[#0a0c16]/85">
          <p className="text-[13px] font-medium text-ink">Supprimer cette note&nbsp;?</p>
          <p className="text-[11px] text-ink-faint">Vous pourrez annuler juste après.</p>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirmDelete}
              className="rounded-full bg-rose-500 px-4 py-2 text-[11.5px] font-medium text-white transition hover:bg-rose-600"
            >
              Supprimer
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="rounded-full border border-white/60 bg-white/60 px-4 py-2 text-[11.5px] font-medium text-ink transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function GallerySkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 pt-4 pb-16 md:px-6">
      <div className="glass animate-pulse rounded-[30px] p-6 md:p-8">
        <div className="h-3 w-24 rounded-full bg-white/50 dark:bg-white/10" />
        <div className="mt-4 h-10 w-2/3 rounded-full bg-white/50 dark:bg-white/10" />
        <div className="mt-4 h-4 w-1/2 rounded-full bg-white/40 dark:bg-white/10" />
        <div className="mt-7 h-10 w-full rounded-xl bg-white/40 dark:bg-white/10" />
        <div className="mt-4 flex gap-2">
          {[80, 100, 120].map((width) => (
            <div
              key={width}
              className="h-7 rounded-full bg-white/40 dark:bg-white/10"
              style={{ width }}
            />
          ))}
        </div>
      </div>
      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="glass h-[236px] animate-pulse rounded-[26px] p-5">
            <div className="h-3 w-20 rounded-full bg-white/50 dark:bg-white/10" />
            <div className="mt-6 h-6 w-3/4 rounded-full bg-white/50 dark:bg-white/10" />
            <div className="mt-4 space-y-2.5">
              <div className="h-3 w-full rounded-full bg-white/40 dark:bg-white/10" />
              <div className="h-3 w-11/12 rounded-full bg-white/40 dark:bg-white/10" />
              <div className="h-3 w-2/3 rounded-full bg-white/40 dark:bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
