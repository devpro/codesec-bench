/**
 * Correct counterpart of src/render.ts.
 *
 * Same signature, same template literals, same markup.
 * Every interpolated value is escaped first.
 *
 * Any finding reported in this file is a false positive.
 */

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ENTITIES[character]);
}

export function renderSearchPage(term: string, matches: string[]): string {
  const heading = `<h1>Results for ${escapeHtml(term)}</h1>`;

  const items = matches.map((match) => `<li>${escapeHtml(match)}</li>`).join("");

  return `<!doctype html><html><body>${heading}<ul>${items}</ul></body></html>`;
}
