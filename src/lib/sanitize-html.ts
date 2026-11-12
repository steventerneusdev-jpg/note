const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "DEL",
  "BR",
  "P",
  "DIV",
  "SPAN",
  "H1",
  "H2",
  "H3",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "MARK",
  "HR",
  "FONT",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "href",
  "title",
  "style",
  "color",
  "face",
  "size",
  "target",
  "rel",
  "data-list",
]);

const ALLOWED_STYLES = new Set([
  "color",
  "background-color",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
]);

const DANGEROUS_SELECTOR = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "img",
  "video",
  "audio",
  "canvas",
  "noscript",
].join(",");

/**
 * Nettoie le HTML riche produit par l'éditeur ou collé depuis l'extérieur.
 * Seules les balises de mise en forme et les styles de texte sont conservés.
 */
export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined" || !html) return "";

  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll(DANGEROUS_SELECTOR).forEach((node) => node.remove());

  template.content.querySelectorAll("*").forEach((node) => {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }

    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();

      if (!ALLOWED_ATTRIBUTES.has(name)) {
        node.removeAttribute(attribute.name);
        continue;
      }

      if (name === "href") {
        const href = attribute.value.trim().toLowerCase();
        const safe = /^(https?:|mailto:|tel:|#|\/)/.test(href);
        if (!safe) node.removeAttribute(attribute.name);
      }

      if (name === "style") {
        const element = node as HTMLElement;
        const kept = Array.from(element.style).filter((property) => {
          const value = element.style.getPropertyValue(property);
          return ALLOWED_STYLES.has(property) && !value.includes("url(") && !value.includes("expression");
        });
        const style = kept
          .map((property) => `${property}: ${element.style.getPropertyValue(property)}`)
          .join("; ");
        element.removeAttribute("style");
        if (style) element.setAttribute("style", style);
      }
    }
  });

  return template.innerHTML;
}
