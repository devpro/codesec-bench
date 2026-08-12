/**
 * Correct counterpart of src/fetcher.ts.
 *
 * Same fetch call, same exports, same names.
 * The URL is parsed and its host compared for equality against an allowlist, so the decision is made on the
 * authority the runtime will actually connect to rather than on the shape of the string.
 *
 * Any finding reported in this file is a false positive.
 */

const ALLOWED_HOSTS = new Set(["reports.internal", "metrics.internal"]);

function requireAllowedUrl(target: string): URL {
  const url = new URL(target);

  if (url.protocol !== "https:") {
    throw new Error("Upstream protocol is not allowed");
  }

  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error("Upstream host is not allowed");
  }

  return url;
}

export async function fetchReport(target: string): Promise<string> {
  const url = requireAllowedUrl(target);

  const response = await fetch(url, { headers: { accept: "application/json" } });

  return response.text();
}

export async function fetchReportGuarded(target: string): Promise<string> {
  const url = requireAllowedUrl(target);

  const response = await fetch(url, { headers: { accept: "application/json" } });

  return response.text();
}
