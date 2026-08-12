/**
 * Upstream report retrieval.
 *
 * Intentionally vulnerable, see cases/ssrf-crossfile and cases/ssrf-allowlist-bypass.
 */

const ALLOWED_PREFIX = "https://reports.internal";

/**
 * Fetch an upstream report with no validation whatsoever.
 *
 * The URL arrives from a query parameter in another module, so an attacker chooses the host.
 * Pointing it at http://169.254.169.254/ returns cloud instance credentials from inside the network boundary.
 */
export async function fetchReport(target: string): Promise<string> {
  // VULN: the target is attacker controlled and reaches the request unmodified.
  const response = await fetch(target, { headers: { accept: "application/json" } });

  return response.text();
}

/**
 * Fetch an upstream report behind an allowlist that does not hold.
 *
 * startsWith constrains the beginning of the string and says nothing about where the authority ends.
 * "https://reports.internal.evil.com/" passes the check and resolves to a host the attacker controls,
 * because the prefix is not terminated by a separator.
 */
export async function fetchReportGuarded(target: string): Promise<string> {
  if (!target.startsWith(ALLOWED_PREFIX)) {
    throw new Error("Upstream host is not allowed");
  }

  // VULN: the guard above passes for https://reports.internal.evil.com/
  const response = await fetch(target, { headers: { accept: "application/json" } });

  return response.text();
}
