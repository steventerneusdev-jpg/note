"use client";

import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  applyBlock,
  createLink,
  handleQuoteEnter,
  indentListItem,
  placeCaretAtEnd,
  readFormatState,
  setHighlightColor,
  toggleHighlight,
  toggleList,
  type ListKind,
} from "@/lib/rich-text";
import { cn } from "cn";
import {
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

type Field = "body" | "title" | "subtitle";

type Marks = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  block: string;
  quote: boolean;
  list: ListKind | null;
  highlight: boolean;
};

type RichEditorProps = {
  noteId: string;
  initialHtml: string;
  titleHtml: string;
  titleText: string;
  subtitleHtml: string;
  subtitleText: string;
  onChange: (html: string, text: string) => void;
  onTitleChange: (html: string, text: string) => void;
  onSubtitleChange: (html: string, text: string) => void;
  header?: ReactNode;
  className?: string;
};

const EMPTY_MARKS: Marks = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  block: "p",
  quote: false,
  list: null,
  highlight: false,
};

const HIGHLIGHT_COLORS = [
  { label: "Bleu", value: "rgba(37, 99, 235, 0.3)" },
  { label: "Cyan", value: "rgba(6, 182, 212, 0.3)" },
  { label: "Émeraude", value: "rgba(16, 185, 129, 0.3)" },
  { label: "Ambre", value: "rgba(245, 158, 11, 0.34)" },
  { label: "Rose", value: "rgba(244, 63, 94, 0.28)" },
];

const DEFAULT_HIGHLIGHT = HIGHLIGHT_COLORS[0].value;

function queryState(command: string): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function plainText(element: HTMLElement): string {
  return element.innerText.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

function isEmptyBody(element: HTMLElement): boolean {
  return !element.textContent?.trim() && !element.querySelector("br");
}

export function RichEditor({
  noteId,
  initialHtml,
  titleHtml,
  titleText,
  subtitleHtml,
  subtitleText,
  onChange,
  onTitleChange,
  onSubtitleChange,
  header,
  className,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  const initialHtmlRef = useRef(initialHtml);
  const titleHtmlRef = useRef(titleHtml);
  const titleTextRef = useRef(titleText);
  const subtitleHtmlRef = useRef(subtitleHtml);
  const subtitleTextRef = useRef(subtitleText);

  const onChangeRef = useRef(onChange);
  const onTitleChangeRef = useRef(onTitleChange);
  const onSubtitleChangeRef = useRef(onSubtitleChange);

  const activeFieldRef = useRef<Field>("body");
  const colorRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  const [activeField, setActiveField] = useState<Field>("body");
  const [marks, setMarks] = useState<Marks>(EMPTY_MARKS);
  const [colorOpen, setColorOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
  }, [onTitleChange]);

  useEffect(() => {
    onSubtitleChangeRef.current = onSubtitleChange;
  }, [onSubtitleChange]);

  const getFieldElement = useCallback((field: Field) => {
    if (field === "title") return titleRef.current;
    if (field === "subtitle") return subtitleRef.current;
    return editorRef.current;
  }, []);

  const refreshMarks = useCallback(() => {
    const element = getFieldElement(activeFieldRef.current);
    if (!element) return;

    const format = readFormatState(element);
    setMarks({
      bold: queryState("bold"),
      italic: queryState("italic"),
      underline: queryState("underline"),
      strike: queryState("strikeThrough"),
      block: format.block,
      quote: format.quote,
      list: format.list,
      highlight: format.highlight,
    });
  }, [getFieldElement]);

  const commitField = useCallback(
    (field: Field) => {
      const element = getFieldElement(field);
      if (!element) return;

      if (field === "body") {
        element.dataset.empty = String(isEmptyBody(element));
        onChangeRef.current(element.innerHTML, element.innerText);
        return;
      }

      element.dataset.empty = String(!element.textContent?.trim());
      const text = plainText(element);

      if (field === "title") onTitleChangeRef.current(element.innerHTML, text);
      else onSubtitleChangeRef.current(element.innerHTML, text);
    },
    [getFieldElement],
  );

  const sync = useCallback(() => {
    commitField(activeFieldRef.current);
    refreshMarks();
  }, [commitField, refreshMarks]);

  const activate = useCallback(
    (field: Field) => {
      activeFieldRef.current = field;
      setActiveField(field);
      if (field !== "body") setLinkOpen(false);
      refreshMarks();
    },
    [refreshMarks],
  );

  useEffect(() => {
    const body = editorRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;

    if (body) {
      body.innerHTML = sanitizeHtml(initialHtmlRef.current);
      body.dataset.empty = String(isEmptyBody(body));
    }

    if (title) {
      title.innerHTML = sanitizeHtml(titleHtmlRef.current || escapeHtml(titleTextRef.current));
      title.dataset.empty = String(!title.textContent?.trim());
    }

    if (subtitle) {
      subtitle.innerHTML = sanitizeHtml(
        subtitleHtmlRef.current || escapeHtml(subtitleTextRef.current),
      );
      subtitle.dataset.empty = String(!subtitle.textContent?.trim());
    }

    activeFieldRef.current = "body";
  }, [noteId]);

  useEffect(() => {
    // La route peut être restaurée depuis le cache du routeur : le contenu
    // contentEditable n'est alors plus garanti. On le réaligne sur les props,
    // sans toucher au champ que l'utilisateur est en train d'éditer.
    function syncField(element: HTMLElement | null, html: string, mode: "body" | "text") {
      if (!element) return;
      const next = sanitizeHtml(html);
      if (element.innerHTML === next) return;
      if (document.activeElement === element) {
        if (!element.innerHTML.trim() && next) {
          element.innerHTML = next;
          element.dataset.empty = String(
            mode === "body" ? isEmptyBody(element) : !element.textContent?.trim(),
          );
        }
        return;
      }
      element.innerHTML = next;
      element.dataset.empty = String(
        mode === "body" ? isEmptyBody(element) : !element.textContent?.trim(),
      );
    }

    syncField(editorRef.current, initialHtml, "body");
    syncField(titleRef.current, titleHtml || escapeHtml(titleText), "text");
    syncField(subtitleRef.current, subtitleHtml || escapeHtml(subtitleText), "text");
  }, [initialHtml, subtitleHtml, subtitleText, titleHtml, titleText]);

  useEffect(() => {
    function handleSelectionChange() {
      const element = getFieldElement(activeFieldRef.current);
      const selection = document.getSelection();
      if (!element || !selection || selection.rangeCount === 0) return;
      if (!element.contains(selection.anchorNode)) return;
      refreshMarks();
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [getFieldElement, refreshMarks]);

  useEffect(() => {
    if (!colorOpen && !linkOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (colorOpen && !colorRef.current?.contains(target)) setColorOpen(false);
      if (linkOpen && !linkRef.current?.contains(target)) setLinkOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [colorOpen, linkOpen]);

  const runInline = useCallback(
    (command: string) => {
      const element = getFieldElement(activeFieldRef.current);
      if (!element) return;

      try {
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand(command, false);
      } catch {
        // Commande non prise en charge par le navigateur.
      }

      sync();
    },
    [getFieldElement, sync],
  );

  const runBlock = useCallback(
    (tag: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      applyBlock(editor, tag);
      sync();
    },
    [sync],
  );

  const runList = useCallback(
    (kind: ListKind) => {
      const editor = editorRef.current;
      if (!editor) return;
      toggleList(editor, kind);
      sync();
    },
    [sync],
  );

  const runHighlight = useCallback(() => {
    const element = getFieldElement(activeFieldRef.current);
    if (!element) return;
    toggleHighlight(element, DEFAULT_HIGHLIGHT);
    sync();
  }, [getFieldElement, sync]);

  const runHighlightColor = useCallback(
    (color: string) => {
      const element = getFieldElement(activeFieldRef.current);
      if (!element) return;
      setHighlightColor(element, color);
      setColorOpen(false);
      sync();
    },
    [getFieldElement, sync],
  );

  const openLinkPanel = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (linkOpen) {
      setLinkOpen(false);
      return;
    }

    const selection = document.getSelection();
    savedRange.current =
      selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)
        ? selection.getRangeAt(0).cloneRange()
        : null;

    setColorOpen(false);
    setLinkValue("");
    setLinkOpen(true);
  }, [linkOpen]);

  const applyLink = useCallback(() => {
    const editor = editorRef.current;
    const raw = linkValue.trim();
    if (!editor || !raw) return;

    const url = /^(https?:\/\/|mailto:|tel:)/i.test(raw) ? raw : `https://${raw}`;

    try {
      new URL(url);
    } catch {
      return;
    }

    editor.focus();

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      if (savedRange.current) {
        selection.addRange(savedRange.current);
      } else {
        placeCaretAtEnd(editor);
      }
    }

    createLink(editor, url);
    savedRange.current = null;
    setLinkOpen(false);
    setLinkValue("");
    sync();
  }, [linkValue, sync]);

  function handlePaste(event: ReactClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");

    if (html.trim()) {
      try {
        document.execCommand("insertHTML", false, sanitizeHtml(html));
      } catch {
        document.execCommand("insertText", false, text);
      }
    } else {
      document.execCommand("insertText", false, text);
    }

    sync();
  }

  function handleFieldPaste(field: Field, event: ReactClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    commitField(field);
  }

  function focusBodyStart() {
    const body = editorRef.current;
    if (!body) return;

    body.focus();
    const range = document.createRange();
    range.selectNodeContents(body);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    activate("body");
  }

  function handleFieldKeyDown(field: Field, event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (field === "title") subtitleRef.current?.focus();
      else focusBodyStart();
    }

    if (event.key === "Escape") {
      event.currentTarget.blur();
    }
  }

  function handleBodyKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;

    if (event.key === "Tab") {
      const handled = indentListItem(editor, event.shiftKey ? "out" : "in");
      if (handled) {
        event.preventDefault();
        sync();
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      if (handleQuoteEnter(editor)) {
        event.preventDefault();
        sync();
      }
    }
  }

  function handleBodyClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (!event.metaKey && !event.ctrlKey) return;

    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || !editorRef.current?.contains(anchor)) return;

    event.preventDefault();
    window.open(anchor.href, "_blank", "noopener,noreferrer");
  }

  const showBlockTools = activeField === "body";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        role="toolbar"
        aria-label="Mise en forme du texte"
        className="relative z-20 flex shrink-0 flex-wrap items-center gap-0.5 border-b border-white/40 bg-[var(--toolbar)] px-2 py-1.5 md:px-3 dark:border-white/10"
      >
        <ToolButton tooltip="Annuler" onClick={() => runInline("undo")}>
          <Undo2 className="size-4" strokeWidth={1.7} />
        </ToolButton>
        <ToolButton tooltip="Rétablir" onClick={() => runInline("redo")}>
          <Redo2 className="size-4" strokeWidth={1.7} />
        </ToolButton>
        <ToolDivider />
        <ToolButton tooltip="Gras" active={marks.bold} onClick={() => runInline("bold")}>
          <span className="text-[15px] leading-none font-black">B</span>
        </ToolButton>
        <ToolButton tooltip="Italique" active={marks.italic} onClick={() => runInline("italic")}>
          <Italic className="size-4" strokeWidth={1.9} />
        </ToolButton>
        <ToolButton
          tooltip="Souligné"
          active={marks.underline}
          onClick={() => runInline("underline")}
        >
          <Underline className="size-4" strokeWidth={1.8} />
        </ToolButton>
        <ToolButton tooltip="Barré" active={marks.strike} onClick={() => runInline("strikeThrough")}>
          <Strikethrough className="size-4" strokeWidth={1.8} />
        </ToolButton>
        <ToolDivider />
        <ToolButton
          tooltip="Surligner / retirer le surlignage"
          active={marks.highlight}
          onClick={runHighlight}
        >
          <Highlighter className="size-4" strokeWidth={1.8} />
        </ToolButton>
        <div ref={colorRef} className="relative">
          <ToolButton
            tooltip="Couleur du surligneur"
            active={colorOpen}
            onClick={() => setColorOpen((open) => !open)}
          >
            <Palette className="size-4" strokeWidth={1.8} />
          </ToolButton>
          {colorOpen ? (
            <div className="glass-thin absolute top-full left-0 z-40 mt-2 flex gap-1.5 rounded-xl p-1.5">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={`Surligner en ${color.label.toLowerCase()}`}
                  title={color.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => runHighlightColor(color.value)}
                  className="size-5 rounded-full ring-1 ring-black/10 transition hover:scale-110"
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {showBlockTools ? (
          <>
            <ToolDivider />
            <ToolButton
              tooltip="Titre 1"
              active={marks.block === "h1"}
              onClick={() => runBlock("h1")}
            >
              <span className="text-[10.5px] font-bold tracking-tight">H1</span>
            </ToolButton>
            <ToolButton
              tooltip="Titre 2"
              active={marks.block === "h2"}
              onClick={() => runBlock("h2")}
            >
              <span className="text-[10.5px] font-bold tracking-tight">H2</span>
            </ToolButton>
            <ToolButton
              tooltip="Titre 3"
              active={marks.block === "h3"}
              onClick={() => runBlock("h3")}
            >
              <span className="text-[10.5px] font-bold tracking-tight">H3</span>
            </ToolButton>
            <ToolDivider />
            <ToolButton
              tooltip="Liste à puces"
              active={marks.list === "ul"}
              onClick={() => runList("ul")}
            >
              <List className="size-4" strokeWidth={1.8} />
            </ToolButton>
            <ToolButton
              tooltip="Liste numérotée"
              active={marks.list === "ol"}
              onClick={() => runList("ol")}
            >
              <ListOrdered className="size-4" strokeWidth={1.8} />
            </ToolButton>
            <ToolButton
              tooltip="Liste à tirets"
              active={marks.list === "dash"}
              onClick={() => runList("dash")}
            >
              <Minus className="size-4" strokeWidth={2.2} />
            </ToolButton>
            <ToolButton
              tooltip="Citation"
              active={marks.quote}
              onClick={() => runBlock("blockquote")}
            >
              <Quote className="size-4" strokeWidth={1.8} />
            </ToolButton>
            <div ref={linkRef} className="relative">
              <ToolButton tooltip="Insérer un lien" active={linkOpen} onClick={openLinkPanel}>
                <Link2 className="size-4" strokeWidth={1.8} />
              </ToolButton>
              {linkOpen ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyLink();
                  }}
                  className="glass-thin absolute top-full left-0 z-40 mt-2 flex w-64 items-center gap-1.5 rounded-xl p-1.5"
                >
                  <input
                    autoFocus
                    value={linkValue}
                    onChange={(event) => setLinkValue(event.target.value)}
                    placeholder="https://exemple.com"
                    aria-label="Adresse du lien"
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-[12px] text-ink outline-none placeholder:text-ink-faint"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-glow px-2.5 py-1 text-[11px] font-medium text-white transition hover:brightness-110"
                  >
                    Lier
                  </button>
                </form>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="editor-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-none px-4 py-7 md:px-10 md:py-9 lg:px-28 xl:px-32">
          {header}
          <div
            ref={titleRef}
            role="textbox"
            aria-multiline="false"
            aria-label="Titre de la note"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            data-empty={titleText.trim() ? "false" : "true"}
            data-placeholder="Titre de la note"
            onInput={() => commitField("title")}
            onBlur={() => commitField("title")}
            onFocus={() => activate("title")}
            onKeyDown={(event) => handleFieldKeyDown("title", event)}
            onPaste={(event) => handleFieldPaste("title", event)}
            onKeyUp={refreshMarks}
            onMouseUp={refreshMarks}
            className="field-editor mt-2 w-full bg-transparent text-[clamp(1.9rem,4.6vw,2.8rem)] leading-[1.12] font-[590] tracking-[-0.04em] text-ink"
          />
          <div
            ref={subtitleRef}
            role="textbox"
            aria-multiline="false"
            aria-label="Sous-titre de la note"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            data-empty={subtitleText.trim() ? "false" : "true"}
            data-placeholder="Sous-titre de la note"
            onInput={() => commitField("subtitle")}
            onBlur={() => commitField("subtitle")}
            onFocus={() => activate("subtitle")}
            onKeyDown={(event) => handleFieldKeyDown("subtitle", event)}
            onPaste={(event) => handleFieldPaste("subtitle", event)}
            onKeyUp={refreshMarks}
            onMouseUp={refreshMarks}
            className="field-editor mt-1.5 w-full bg-transparent text-[15px] font-medium text-ink-soft"
          />
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Contenu de la note"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            data-empty={initialHtml ? "false" : "true"}
            onInput={sync}
            onBlur={sync}
            onFocus={() => activate("body")}
            onPaste={handlePaste}
            onKeyUp={refreshMarks}
            onMouseUp={refreshMarks}
            onKeyDown={handleBodyKeyDown}
            onClick={handleBodyClick}
            className="note-editor mt-8"
          />
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  tooltip,
  active = false,
  onClick,
  children,
}: {
  tooltip: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={tooltip}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "group relative flex size-8 shrink-0 items-center justify-center rounded-lg transition",
        active
          ? "bg-glow/15 text-glow ring-1 ring-glow/30"
          : "text-ink-soft hover:bg-white/60 hover:text-ink dark:hover:bg-white/10",
      )}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-md bg-[#0a1224] px-2 py-1 text-[10px] font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {tooltip}
      </span>
    </button>
  );
}

function ToolDivider() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/10" />;
}
