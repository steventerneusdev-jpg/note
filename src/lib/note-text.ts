const longDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export function normalizeTag(value: string): string {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const tag = normalizeTag(entry);
    if (!tag) continue;
    const key = tag.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function excerpt(text: string, maxLength = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}…`;
}

export function formatNoteDate(timestamp: number): string {
  return longDate.format(timestamp);
}

export function formatRelativeDate(timestamp: number, now = Date.now()): string {
  const minutes = Math.round((now - timestamp) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;

  return shortDate.format(timestamp);
}
