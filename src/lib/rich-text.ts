const BLOCK_TAGS = ["p", "div", "h1", "h2", "h3", "blockquote", "li", "pre"];

const BLOCK_LEVEL_TAGS = [
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "ul",
  "ol",
  "li",
  "pre",
  "hr",
];

export type ListKind = "ul" | "ol" | "dash";

const MAX_LIST_DEPTH = 15;

function toElement(node: Node | null): HTMLElement | null {
  if (!node) return null;
  if (node instanceof HTMLElement) return node;
  return node.parentElement;
}

export function getEditorSelection(editor: HTMLElement): Selection | null {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  return selection;
}

export function closestTag(
  node: Node | null,
  editor: HTMLElement,
  tags: string[],
): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== editor) {
    if (current instanceof HTMLElement && tags.includes(current.tagName.toLowerCase())) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function isBlockElement(node: Node | null): node is HTMLElement {
  return (
    node instanceof HTMLElement && BLOCK_LEVEL_TAGS.includes(node.tagName.toLowerCase())
  );
}

function outermostBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
  let current = toElement(node);
  let candidate: HTMLElement | null = null;
  while (current && current !== editor) {
    if (BLOCK_TAGS.includes(current.tagName.toLowerCase())) candidate = current;
    current = current.parentElement;
  }
  return candidate;
}

/**
 * La première ligne d'un contentEditable est parfois un simple nœud texte,
 * sans bloc parent. On regroupe alors les nœuds inline dans un paragraphe.
 */
function wrapInlineRun(editor: HTMLElement, node: Node | null): HTMLElement | null {
  let current: Node | null = node;
  if (!current || current === editor) return null;
  while (current && current.parentNode !== editor) current = current.parentNode;
  if (!current || current === editor) return null;
  if (isBlockElement(current)) return current;

  let start: Node = current;
  while (start.previousSibling && !isBlockElement(start.previousSibling)) {
    start = start.previousSibling;
  }

  let end: Node = current;
  while (end.nextSibling && !isBlockElement(end.nextSibling)) {
    end = end.nextSibling;
  }

  const paragraph = document.createElement("p");
  editor.insertBefore(paragraph, start);

  let cursor: Node | null = start;
  while (cursor) {
    const following: Node | null = cursor.nextSibling;
    paragraph.appendChild(cursor);
    if (cursor === end) break;
    cursor = following;
  }

  return paragraph;
}

function resolveBlockNode(editor: HTMLElement, node: Node | null): Node | null {
  let current = node;
  if (!current || current === editor) current = editor.firstChild;
  if (!current) return null;

  if (current instanceof HTMLElement) {
    const tag = current.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") return current.querySelector("li");
    if (tag === "blockquote") {
      return current.querySelector("p, h1, h2, h3, li") ?? current.firstChild;
    }
  }

  return current;
}

function ensureBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
  const resolved = resolveBlockNode(editor, node);
  const existing = outermostBlock(editor, resolved);
  if (existing) return existing;

  const wrapped = wrapInlineRun(editor, resolved);
  if (wrapped) return wrapped;

  if (editor.childNodes.length === 0) return null;

  const paragraph = document.createElement("p");
  while (editor.firstChild) paragraph.appendChild(editor.firstChild);
  editor.appendChild(paragraph);
  return paragraph;
}

function listKind(list: HTMLElement): ListKind {
  if (list.tagName.toLowerCase() === "ol") return "ol";
  return list.getAttribute("data-list") === "dash" ? "dash" : "ul";
}

function createList(kind: ListKind): HTMLElement {
  const list = document.createElement(kind === "ol" ? "ol" : "ul");
  if (kind === "dash") list.setAttribute("data-list", "dash");
  return list;
}

function listDepth(item: HTMLElement, editor: HTMLElement): number {
  let depth = 0;
  let current: HTMLElement | null = item.parentElement;
  while (current && current !== editor) {
    const tag = current.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") depth += 1;
    current = current.parentElement;
  }
  return depth;
}

export function placeCaretAtEnd(element: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function expandToWord(range: Range): Range {
  if (!range.collapsed) return range;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return range;

  const text = node.textContent ?? "";
  let start = range.startOffset;
  let end = range.startOffset;
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  while (end < text.length && !/\s/.test(text[end])) end += 1;
  if (start === end) return range;

  const expanded = document.createRange();
  expanded.setStart(node, start);
  expanded.setEnd(node, end);
  return expanded;
}

function wrapRange(range: Range, wrapper: HTMLElement): void {
  const fragment = range.extractContents();
  wrapper.appendChild(fragment);
  range.insertNode(wrapper);

  const next = document.createRange();
  next.selectNodeContents(wrapper);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(next);
}

function unwrapElement(element: HTMLElement): void {
  const parent = element.parentElement;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  element.remove();
  parent.normalize();
  placeCaretAtEnd(parent);
}

export function applyBlock(editor: HTMLElement, tag: string): void {
  const selection = getEditorSelection(editor);
  if (!selection) return;

  const block = ensureBlock(editor, selection.anchorNode);

  if (!block) {
    const element = document.createElement(tag);
    element.innerHTML = "<br>";
    editor.appendChild(element);
    placeCaretAtEnd(element);
    return;
  }

  const currentTag = block.tagName.toLowerCase();
  const nextTag = currentTag === tag ? "p" : tag;
  const replacement = document.createElement(nextTag);

  while (block.firstChild) replacement.appendChild(block.firstChild);
  if (!replacement.childNodes.length) replacement.innerHTML = "<br>";

  if (currentTag === "li") {
    const list = block.parentElement;
    if (list && (list.tagName.toLowerCase() === "ul" || list.tagName.toLowerCase() === "ol")) {
      list.insertAdjacentElement("afterend", replacement);
      block.remove();
      if (!list.querySelector("li")) list.remove();
    } else {
      block.replaceWith(replacement);
    }
  } else {
    block.replaceWith(replacement);
  }

  placeCaretAtEnd(replacement);
}

export function toggleList(editor: HTMLElement, kind: ListKind): void {
  const selection = getEditorSelection(editor);
  if (!selection) return;

  const existing = closestTag(selection.anchorNode, editor, ["ul", "ol"]);

  if (existing) {
    if (listKind(existing) === kind) {
      const paragraphs: HTMLElement[] = [];

      Array.from(existing.children).forEach((child) => {
        if (child.tagName.toLowerCase() !== "li") return;
        const paragraph = document.createElement("p");
        while (child.firstChild) paragraph.appendChild(child.firstChild);
        if (!paragraph.childNodes.length) paragraph.innerHTML = "<br>";
        paragraphs.push(paragraph);
      });

      const fragment = document.createDocumentFragment();
      paragraphs.forEach((paragraph) => fragment.appendChild(paragraph));
      existing.replaceWith(fragment);

      if (paragraphs[0]) placeCaretAtEnd(paragraphs[0]);
      return;
    }

    const replacement = createList(kind);
    while (existing.firstChild) replacement.appendChild(existing.firstChild);
    existing.replaceWith(replacement);
    placeCaretAtEnd((replacement.lastElementChild as HTMLElement | null) ?? replacement);
    return;
  }

  const block = ensureBlock(editor, selection.anchorNode);

  if (!block) {
    const list = createList(kind);
    const item = document.createElement("li");
    item.innerHTML = "<br>";
    list.appendChild(item);
    editor.appendChild(list);
    placeCaretAtEnd(item);
    return;
  }

  const list = createList(kind);
  const item = document.createElement("li");
  while (block.firstChild) item.appendChild(block.firstChild);
  if (!item.childNodes.length) item.innerHTML = "<br>";
  list.appendChild(item);
  block.replaceWith(list);
  placeCaretAtEnd(item);
}

export function indentListItem(editor: HTMLElement, direction: "in" | "out"): boolean {
  const selection = getEditorSelection(editor);
  if (!selection) return false;

  const item = closestTag(selection.anchorNode, editor, ["li"]);
  if (!item) return false;

  const list = item.parentElement;
  if (!list || !["ul", "ol"].includes(list.tagName.toLowerCase())) return true;

  if (direction === "out") {
    const parentItem = list.parentElement?.closest("li");
    const grandList = parentItem?.parentElement;
    if (!parentItem || !grandList || !["ul", "ol"].includes(grandList.tagName.toLowerCase())) {
      return true;
    }

    grandList.insertBefore(item, parentItem.nextElementSibling);
    if (!list.querySelector("li")) list.remove();
    placeCaretAtEnd(item);
    return true;
  }

  if (listDepth(item, editor) >= MAX_LIST_DEPTH) return true;

  const previous = item.previousElementSibling;
  if (!previous || previous.tagName.toLowerCase() !== "li") return true;

  let sublist: HTMLElement | null = null;
  const last = previous.lastElementChild;
  if (last && (last.tagName.toLowerCase() === "ul" || last.tagName.toLowerCase() === "ol")) {
    sublist = last as HTMLElement;
  }

  if (!sublist) {
    sublist = createList(listKind(list));
    previous.appendChild(sublist);
  }

  sublist.appendChild(item);
  placeCaretAtEnd(item);
  return true;
}

export function toggleHighlight(editor: HTMLElement, color: string): void {
  const selection = getEditorSelection(editor);
  if (!selection) return;

  const range = expandToWord(selection.getRangeAt(0));
  if (range.collapsed) return;

  const startMark = closestTag(range.startContainer, editor, ["mark"]);
  const endMark = closestTag(range.endContainer, editor, ["mark"]);

  if (startMark && endMark && startMark === endMark) {
    unwrapElement(startMark);
    return;
  }

  const wrapper = document.createElement("mark");
  wrapper.style.backgroundColor = color;
  wrapRange(range, wrapper);
}

export function setHighlightColor(editor: HTMLElement, color: string): void {
  const selection = getEditorSelection(editor);
  if (!selection) return;

  const range = expandToWord(selection.getRangeAt(0));
  if (range.collapsed) return;

  const marks = Array.from(editor.querySelectorAll("mark")).filter((mark) =>
    range.intersectsNode(mark),
  );

  if (marks.length > 0) {
    marks.forEach((mark) => {
      mark.style.backgroundColor = color;
    });
    return;
  }

  const wrapper = document.createElement("mark");
  wrapper.style.backgroundColor = color;
  wrapRange(range, wrapper);
}

export function createLink(editor: HTMLElement, url: string): void {
  let selection = getEditorSelection(editor);

  if (!selection) {
    placeCaretAtEnd(editor);
    selection = getEditorSelection(editor);
  }

  if (!selection) return;

  const range = selection.getRangeAt(0);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noreferrer noopener";

  if (range.collapsed) {
    anchor.textContent = url.replace(/^mailto:/, "");
    range.insertNode(anchor);

    const after = document.createRange();
    after.setStartAfter(anchor);
    after.collapse(true);
    selection.removeAllRanges();
    selection.addRange(after);
    return;
  }

  wrapRange(range, anchor);
}

function quoteLineInfo(quote: HTMLElement, range: Range): { text: string; afterBreak: boolean } {
  const before = range.cloneRange();
  before.selectNodeContents(quote);
  before.setEnd(range.startContainer, range.startOffset);

  const container = document.createElement("div");
  container.appendChild(before.cloneContents());

  const lines = container.innerHTML.split(/<br\s*\/?>|<\/(?:p|div|li|h[1-6])>/i);
  const current = document.createElement("div");
  current.innerHTML = lines[lines.length - 1] ?? "";

  return {
    text: current.textContent ?? "",
    afterBreak: lines.length > 1,
  };
}

function exitQuote(quote: HTMLElement): void {
  let node = quote.lastChild;
  while (node) {
    const previous = node.previousSibling;
    if (node.nodeName === "BR") {
      node.remove();
      node = previous;
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? "").trim()) {
      node.remove();
      node = previous;
      continue;
    }
    if (node instanceof HTMLElement && !node.textContent?.trim() && !node.querySelector("br")) {
      node.remove();
      node = previous;
      continue;
    }
    break;
  }

  const lastBlock = quote.lastElementChild;
  if (lastBlock) {
    while (lastBlock.lastChild && lastBlock.lastChild.nodeName === "BR") {
      lastBlock.lastChild.remove();
    }
  }

  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
  quote.insertAdjacentElement("afterend", paragraph);

  if (!quote.textContent?.trim() && !quote.querySelector("br")) quote.remove();
  placeCaretAtEnd(paragraph);
}

/**
 * Un seul Entrée poursuit la citation sur une nouvelle ligne.
 * Un second Entrée sur la ligne vide termine la citation.
 */
export function handleQuoteEnter(editor: HTMLElement): boolean {
  const selection = getEditorSelection(editor);
  if (!selection) return false;

  const range = selection.getRangeAt(0);
  const quote = closestTag(range.startContainer, editor, ["blockquote"]);
  if (!quote) return false;

  const info = quoteLineInfo(quote, range);

  const tail = range.cloneRange();
  tail.selectNodeContents(quote);
  tail.setStart(range.endContainer, range.endOffset);
  const hasContentAfter = Boolean(tail.toString().trim());

  if (info.text.trim() === "" && info.afterBreak && !hasContentAfter) {
    exitQuote(quote);
    return true;
  }

  const br = document.createElement("br");
  range.deleteContents();
  range.insertNode(br);

  if (!hasContentAfter) {
    // Nettoie les anciens espaces vides de fin de citation puis garantit
    // une ligne d'accueil après le nouveau saut, pour que le curseur puisse
    // vraiment écrire sur la ligne suivante.
    let trailing = br.nextSibling;
    while (
      trailing &&
      (trailing.nodeName === "BR" ||
        (trailing.nodeType === Node.TEXT_NODE && !(trailing.textContent ?? "").trim()))
    ) {
      const afterTrailing = trailing.nextSibling;
      trailing.remove();
      trailing = afterTrailing;
    }
    br.after(document.createElement("br"));
  }

  const after = document.createRange();
  after.setStartAfter(br);
  after.collapse(true);
  selection.removeAllRanges();
  selection.addRange(after);
  return true;
}

export type FormatState = {
  block: string;
  quote: boolean;
  list: ListKind | null;
  highlight: boolean;
};

export function readFormatState(editor: HTMLElement): FormatState {
  const selection = getEditorSelection(editor);
  const node = selection?.anchorNode ?? null;
  const heading = closestTag(node, editor, ["h1", "h2", "h3"]);
  const list = closestTag(node, editor, ["ul", "ol"]);

  return {
    block: heading?.tagName.toLowerCase() ?? "p",
    quote: Boolean(closestTag(node, editor, ["blockquote"])),
    list: list ? listKind(list) : null,
    highlight: Boolean(closestTag(node, editor, ["mark"])),
  };
}
