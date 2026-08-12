#!/usr/bin/env bash
#
# Run one tool against one sample and write SARIF to results/<sample>/<tool>.sarif.
#
# Tools are invoked as locally installed binaries, never as container images.
# Reproducibility therefore comes from recording the version that produced each result rather than from pinning an image tag: every SARIF file carries its tool version, and the matrix reports it.
# See docs/tool-notes.md for install instructions per tool.
#
# The scan is always rooted at the sample directory, which keeps the paths inside the SARIF file relative to that sample and comparable across tools.
#
# Usage:
#   scripts/run_scan.sh <sample> <tool>
#
# Tools:
#   semgrep-community   Semgrep OSS with the p/php and p/owasp-top-ten packs
#   semgrep-custom      Semgrep OSS with the rules committed in the sample
#   opengrep            Opengrep with the same custom rules
#   bearer              Bearer CLI, security scanners only
#
set -euo pipefail

SAMPLE="${1:?usage: run_scan.sh <sample> <tool>}"
TOOL="${2:?usage: run_scan.sh <sample> <tool>}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SAMPLE_DIR="${REPO_ROOT}/samples/${SAMPLE}"
OUT_DIR="${REPO_ROOT}/results/${SAMPLE}"

[ -d "${SAMPLE_DIR}" ] || { echo "No such sample: ${SAMPLE}" >&2; exit 1; }
mkdir -p "${OUT_DIR}"
OUT="${OUT_DIR}/${TOOL}.sarif"
TMP="${SAMPLE_DIR}/.scan.sarif"

# A configured but uninstalled tool is a skip, not a failure.
# Breaking the whole run would deny the remaining tools their columns, and an absent column already says truthfully that there is no data for that tool.
require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "    ${1} is not installed, skipping. Install instructions: docs/tool-notes.md" >&2
    exit 0
  }
}

# Scanners vary enormously in runtime on the same code, and a hung one would otherwise stall the whole pipeline with no output.
# Bearer 2.0.2 takes over fifteen minutes on the PHP sample where Semgrep takes seconds, so the ceiling is generous rather than tight.
SCAN_TIMEOUT="${SCAN_TIMEOUT:-1800}"
run() { timeout --signal=TERM --kill-after=30s "${SCAN_TIMEOUT}" "$@" || true; }

# Which tools apply to a sample, and with which rule packs, comes from its sample.yaml rather than from a language specific branch here.
# Exit code 3 means the tool is not configured for this sample, which is a skip rather than a failure: PHP rule packs make no sense on a Flask app.
if ! ARGS=$(node "${REPO_ROOT}/scripts/sample_meta.mjs" "${SAMPLE}" args "${TOOL}"); then
  status=$?
  if [ "${status}" -eq 3 ]; then
    echo "==> ${TOOL} on ${SAMPLE}: not configured for this sample, skipping"
    exit 0
  fi
  exit "${status}"
fi

ROOTS=$(node "${REPO_ROOT}/scripts/sample_meta.mjs" "${SAMPLE}" roots)

echo "==> ${TOOL} on ${SAMPLE}"
cd "${SAMPLE_DIR}"

# ARGS and ROOTS are deliberately unquoted: both are space separated lists that must expand into separate arguments.
# shellcheck disable=SC2086
case "${TOOL}" in
  semgrep-community | semgrep-custom)
    require semgrep
    SEMGREP_SEND_METRICS=off run semgrep scan ${ARGS} \
      --sarif --output "${TMP}" --quiet ${ROOTS}
    ;;

  opengrep)
    require opengrep
    run opengrep scan ${ARGS} \
      --sarif --output "${TMP}" --quiet ${ROOTS}
    ;;

  bandit)
    require bandit
    run bandit --recursive ${ARGS} --format sarif --output "${TMP}" ${ROOTS}
    ;;

  bearer)
    require bearer
    run bearer scan ${ROOTS} ${ARGS} \
      --scanner secrets,sast --format sarif --output "${TMP}" --quiet
    ;;

  *)
    echo "Unknown tool: ${TOOL}" >&2
    echo "Known tools: semgrep-community semgrep-custom opengrep bandit bearer" >&2
    exit 1
    ;;
esac

# A tool that crashes or times out still exits zero through run(), so the absence of the file is the real signal.
if [ ! -f "${TMP}" ]; then
  echo "    ${TOOL} produced no SARIF output, the scan failed" >&2
  exit 1
fi
# SARIF embeds the full definition of every rule that ran, not just the ones that matched.
# For the community packs that is over a megabyte of metadata behind zero results, rewritten on every rescan, which would bloat the history for no analytical gain.
# Pruning to the referenced rules keeps every finding, the driver version and the CWE metadata that scoring reads.
# ruleIndex is dropped along with it, since the indices no longer address the pruned array and scoring matches on ruleId.
jq '
  .runs |= map(
    ((.results // []) | map(.ruleId) | unique) as $used
    | .tool.driver.rules = ((.tool.driver.rules // []) | map(select(.id as $id | $used | index($id))))
    | .results = ((.results // []) | map(del(.ruleIndex)))
  )
' "${TMP}" > "${OUT}"
rm -f "${TMP}"

COUNT=$(jq '[.runs[].results | length] | add // 0' "${OUT}")
VERSION=$(jq -r '[.runs[].tool.driver | .semanticVersion // .version] | map(select(. != null)) | first // "unknown"' "${OUT}")

echo "    ${COUNT} result(s), version ${VERSION} -> results/${SAMPLE}/${TOOL}.sarif"
