"use client";

import { normalizeTags } from "@/lib/note-text";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Note = {
  id: string;
  title: string;
  titleHtml: string;
  subtitle: string;
  subtitleHtml: string;
  html: string;
  text: string;
  pinned: boolean;
  collectionId: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type Collection = {
  id: string;
  name: string;
  createdAt: number;
};

type NotePatch = Partial<
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
>;

type NotesContextValue = {
  ready: boolean;
  notes: Note[];
  collections: Collection[];
  activeId: string | null;
  activeNote: Note | null;
  createNote: () => string;
  selectNote: (id: string) => void;
  updateNote: (id: string, patch: NotePatch) => void;
  saveNow: () => void;
  deleteNote: (id: string) => Note | null;
  restoreNote: (note: Note) => void;
  togglePin: (id: string) => void;
  createCollection: (name: string) => string | null;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
};

const NOTES_KEY = "lumen.notes.v1";
const COLLECTIONS_KEY = "lumen.collections.v1";
const ACTIVE_KEY = "lumen.active.v1";

const LEGACY_WELCOME_TITLE = "Bienvenue dans Lumen";

const WELCOME_HTML = [
  "<h2>Bienvenue dans votre carnet</h2>",
  "<p>Un espace d'écriture limpide, posé sur du verre. <strong>Grassez</strong>, <em>inclinez</em>, <u>soulignez</u> ou surlignez votre texte avec la barre d'outils.</p>",
  "<p>Ajoutez des listes et des blocs :</p>",
  "<ul><li>Une idée à capturer</li><li>Une phrase en cours</li><li>Un détail à ne pas oublier</li></ul>",
  "<blockquote>« Les notes sont des pensées qui attendent leur heure. »</blockquote>",
  "<p>Retrouvez toutes vos notes dans le <strong>Répertoire</strong>, puis rouvrez-les d'un clic. Tout est enregistré localement, dans votre navigateur.</p>",
].join("");

const WELCOME_TEXT = [
  "Bienvenue dans votre carnet",
  "Un espace d'écriture limpide, posé sur du verre. Grassez, inclinez, soulignez ou surlignez votre texte avec la barre d'outils.",
  "Ajoutez des listes et des blocs :",
  "Une idée à capturer",
  "Une phrase en cours",
  "Un détail à ne pas oublier",
  "« Les notes sont des pensées qui attendent leur heure. »",
  "Retrouvez toutes vos notes dans le Répertoire, puis rouvrez-les d'un clic. Tout est enregistré localement, dans votre navigateur.",
].join(" ");

const LEGACY_WELCOME_HTML = [
  "<h2>Bienvenue dans Lumen</h2>",
  "<p>Un espace d'écriture limpide, posé sur du verre. <strong>Grassez</strong>, <em>inclinez</em>, <u>soulignez</u> ou <mark>surlignez</mark> votre texte avec la barre d'outils.</p>",
  "<p>Ajoutez des listes et des blocs :</p>",
  "<ul><li>Une idée à capturer</li><li>Une phrase en cours</li><li>Un détail à ne pas oublier</li></ul>",
  "<blockquote>« Les notes sont des pensées qui attendent leur heure. »</blockquote>",
  "<p>Retrouvez toutes vos notes dans le <strong>Répertoire</strong>, puis rouvrez-les d'un clic. Tout est enregistré localement, dans votre navigateur.</p>",
].join("");

const NotesContext = createContext<NotesContextValue | null>(null);

function welcomeNote(): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "Bienvenue",
    titleHtml: "",
    subtitle: "Quelques repères pour commencer",
    subtitleHtml: "",
    html: WELCOME_HTML,
    text: WELCOME_TEXT,
    pinned: true,
    collectionId: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNote(value: unknown, index: number): Note | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const html = typeof raw.html === "string" ? raw.html : "";
  const fallbackDate = Date.now() - index;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    title: typeof raw.title === "string" ? raw.title : "",
    titleHtml: typeof raw.titleHtml === "string" ? raw.titleHtml : "",
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    subtitleHtml: typeof raw.subtitleHtml === "string" ? raw.subtitleHtml : "",
    html,
    text: typeof raw.text === "string" ? raw.text : stripHtml(html),
    pinned: raw.pinned === true,
    collectionId: typeof raw.collectionId === "string" && raw.collectionId ? raw.collectionId : null,
    tags: normalizeTags(raw.tags),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : fallbackDate,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : fallbackDate,
  };
}

function normalizeCollection(value: unknown, index: number): Collection | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== "string" || !raw.name.trim()) return null;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    name: raw.name.trim().replace(/\s+/g, " ").slice(0, 40),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now() - index,
  };
}

function dedupeCollections(collections: Collection[]): Collection[] {
  const seen = new Set<string>();
  return collections.filter((collection) => {
    const key = collection.name.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const notesRef = useRef<Note[]>([]);
  const collectionsRef = useRef<Collection[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  const persistNotes = useCallback((next: Note[]) => {
    notesRef.current = next;
    try {
      window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
    } catch {
      // Stockage indisponible : les notes restent en mémoire.
    }
  }, []);

  const persistCollections = useCallback((next: Collection[]) => {
    collectionsRef.current = next;
    try {
      window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(next));
    } catch {
      // Stockage indisponible : les collections restent en mémoire.
    }
  }, []);

  const commitNotes = useCallback(
    (next: Note[]) => {
      persistNotes(next);
      setNotes(next);
    },
    [persistNotes],
  );

  const commitCollections = useCallback(
    (next: Collection[]) => {
      persistCollections(next);
      setCollections(next);
    },
    [persistCollections],
  );

  const persistActive = useCallback((id: string | null) => {
    activeIdRef.current = id;
    try {
      if (id) window.localStorage.setItem(ACTIVE_KEY, id);
      else window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Stockage indisponible : la sélection reste en mémoire.
    }
  }, []);

  const commitActive = useCallback(
    (id: string | null) => {
      persistActive(id);
      setActiveId(id);
    },
    [persistActive],
  );

  useEffect(() => {
    // Lecture du stockage local juste après le premier rendu (évite tout écart d'hydratation).
    const timer = window.setTimeout(() => {
      let loaded: Note[] = [];
      let loadedCollections: Collection[] = [];

      try {
        const raw = window.localStorage.getItem(NOTES_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            loaded = parsed
              .map((entry, index) => normalizeNote(entry, index))
              .filter((entry): entry is Note => entry !== null);
          }
        }
      } catch {
        loaded = [];
      }

      try {
        const raw = window.localStorage.getItem(COLLECTIONS_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            loadedCollections = dedupeCollections(
              parsed
                .map((entry, index) => normalizeCollection(entry, index))
                .filter((entry): entry is Collection => entry !== null),
            );
          }
        }
      } catch {
        loadedCollections = [];
      }

      loaded = loaded.map((note) =>
        note.title === LEGACY_WELCOME_TITLE && note.html === LEGACY_WELCOME_HTML
          ? {
              ...note,
              title: "Bienvenue",
              titleHtml: "",
              subtitle: "Quelques repères pour commencer",
              subtitleHtml: "",
              html: WELCOME_HTML,
              text: WELCOME_TEXT,
            }
          : note,
      );

      const collectionIds = new Set(loadedCollections.map((collection) => collection.id));
      loaded = loaded.map((note) =>
        note.collectionId && !collectionIds.has(note.collectionId)
          ? { ...note, collectionId: null }
          : note,
      );

      if (loaded.length === 0) loaded = [welcomeNote()];

      let storedActive: string | null = null;
      try {
        storedActive = window.localStorage.getItem(ACTIVE_KEY);
      } catch {
        storedActive = null;
      }

      const nextActive = loaded.find((note) => note.id === storedActive)?.id ?? loaded[0].id;

      notesRef.current = loaded;
      setNotes(loaded);
      collectionsRef.current = loadedCollections;
      setCollections(loadedCollections);
      try {
        window.localStorage.setItem(NOTES_KEY, JSON.stringify(loaded));
        window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(loadedCollections));
      } catch {
        // Stockage indisponible.
      }

      activeIdRef.current = nextActive;
      setActiveId(nextActive);
      try {
        window.localStorage.setItem(ACTIVE_KEY, nextActive);
      } catch {
        // Stockage indisponible.
      }

      readyRef.current = true;
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;

    function flush() {
      try {
        window.localStorage.setItem(NOTES_KEY, JSON.stringify(notesRef.current));
        window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collectionsRef.current));
        const id = activeIdRef.current;
        if (id) window.localStorage.setItem(ACTIVE_KEY, id);
      } catch {
        // Stockage indisponible.
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [ready]);

  const saveNow = useCallback(() => {
    if (!readyRef.current) return;
    persistNotes(notesRef.current);
    persistCollections(collectionsRef.current);
    persistActive(activeIdRef.current);
  }, [persistActive, persistCollections, persistNotes]);

  const createNote = useCallback(() => {
    const now = Date.now();
    const note: Note = {
      id: crypto.randomUUID(),
      title: "",
      titleHtml: "",
      subtitle: "",
      subtitleHtml: "",
      html: "",
      text: "",
      pinned: false,
      collectionId: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    commitNotes([note, ...notesRef.current]);
    commitActive(note.id);
    return note.id;
  }, [commitActive, commitNotes]);

  const selectNote = useCallback(
    (id: string) => {
      commitActive(id);
    },
    [commitActive],
  );

  const updateNote = useCallback(
    (id: string, patch: NotePatch) => {
      const next = notesRef.current.map((note) =>
        note.id === id
          ? {
              ...note,
              ...patch,
              ...(patch.tags ? { tags: normalizeTags(patch.tags) } : {}),
              updatedAt: Date.now(),
            }
          : note,
      );
      commitNotes(next);
    },
    [commitNotes],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const current = notesRef.current;
      const target = current.find((note) => note.id === id) ?? null;
      const remaining = current.filter((note) => note.id !== id);

      commitNotes(remaining);

      if (activeIdRef.current === id) {
        commitActive(remaining[0]?.id ?? null);
      }

      return target;
    },
    [commitActive, commitNotes],
  );

  const restoreNote = useCallback(
    (note: Note) => {
      const collectionExists =
        !note.collectionId ||
        collectionsRef.current.some((collection) => collection.id === note.collectionId);
      const restored = collectionExists ? note : { ...note, collectionId: null };

      if (!notesRef.current.some((entry) => entry.id === note.id)) {
        commitNotes([restored, ...notesRef.current]);
      }
      if (!activeIdRef.current) commitActive(note.id);
    },
    [commitActive, commitNotes],
  );

  const togglePin = useCallback(
    (id: string) => {
      const next = notesRef.current.map((note) =>
        note.id === id ? { ...note, pinned: !note.pinned } : note,
      );
      commitNotes(next);
    },
    [commitNotes],
  );

  const createCollection = useCallback(
    (name: string) => {
      const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!clean) return null;

      const existing = collectionsRef.current.find(
        (collection) => collection.name.toLocaleLowerCase("fr-FR") === clean.toLocaleLowerCase("fr-FR"),
      );
      if (existing) return existing.id;

      const collection: Collection = {
        id: crypto.randomUUID(),
        name: clean,
        createdAt: Date.now(),
      };

      commitCollections([...collectionsRef.current, collection]);
      return collection.id;
    },
    [commitCollections],
  );

  const renameCollection = useCallback(
    (id: string, name: string) => {
      const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!clean) return;

      const duplicate = collectionsRef.current.some(
        (collection) =>
          collection.id !== id &&
          collection.name.toLocaleLowerCase("fr-FR") === clean.toLocaleLowerCase("fr-FR"),
      );
      if (duplicate) return;

      const next = collectionsRef.current.map((collection) =>
        collection.id === id ? { ...collection, name: clean } : collection,
      );
      commitCollections(next);
    },
    [commitCollections],
  );

  const deleteCollection = useCallback(
    (id: string) => {
      const nextCollections = collectionsRef.current.filter((collection) => collection.id !== id);
      const nextNotes = notesRef.current.map((note) =>
        note.collectionId === id ? { ...note, collectionId: null } : note,
      );

      commitCollections(nextCollections);
      commitNotes(nextNotes);
    },
    [commitCollections, commitNotes],
  );

  const activeNote = notes.find((note) => note.id === activeId) ?? notes[0] ?? null;

  const value = useMemo<NotesContextValue>(
    () => ({
      ready,
      notes,
      collections,
      activeId,
      activeNote,
      createNote,
      selectNote,
      updateNote,
      saveNow,
      deleteNote,
      restoreNote,
      togglePin,
      createCollection,
      renameCollection,
      deleteCollection,
    }),
    [
      ready,
      notes,
      collections,
      activeId,
      activeNote,
      createNote,
      selectNote,
      updateNote,
      saveNow,
      deleteNote,
      restoreNote,
      togglePin,
      createCollection,
      renameCollection,
      deleteCollection,
    ],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const value = useContext(NotesContext);
  if (!value) throw new Error("useNotes doit être utilisé dans NotesProvider");
  return value;
}
