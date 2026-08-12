/**
 * HTML rendering for the reporting service.
 *
 * Intentionally vulnerable, see cases/reflected-xss.
 */

/**
 * Render the search results page.
 *
 * The term arrives from a query parameter and is interpolated into the markup unescaped,
 * so a term of `<script>fetch('/admin/keys').then(...)</script>` executes in the visitor's session.
 */
export function renderSearchPage(term: string, matches: string[]): string {
  // VULN: the term is placed into HTML with no escaping, which is reflected XSS.
  const heading = `<h1>Results for ${term}</h1>`;

  const items = matches.map((match) => `<li>${match}</li>`).join("");

  return `<!doctype html><html><body>${heading}<ul>${items}</ul></body></html>`;
}
