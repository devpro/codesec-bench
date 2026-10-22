#!/usr/bin/env bash
#
# Run one tool against one sample and write SARIF to report/<sample>/<tool>.sarif.
#
# Tools are invoked as locally installed binaries, never as container images.
# Comparability therefore comes from recording the version that produced each result rather than from pinning an image tag: every SARIF file carries its tool version, and the matrix reports it.
# See docs/tool-notes.md for install instructions per tool.
#
# The scan is always rooted at the sample directory, which keeps the paths inside the SARIF file relative to that sample and comparable across tools.
#
# Usage:
#   scripts/run_scan.sh <sample> <tool>
#
# Tools, each configured per sample in its sample.yaml:
#   semgrep-community   Semgrep OSS with the registry rule packs
#   semgrep-custom      Semgrep OSS with the rules committed in the sample
#   opengrep            Opengrep with the same custom rules
#   codeql              CodeQL CLI, database create then analyze
#   bandit              Bandit, Python only
#   trivy               Trivy, dependency scanning
#
set -euo pipefail

SAMPLE="${1:?usage: run_scan.sh <sample> <tool>}"
TOOL="${2:?usage: run_scan.sh <sample> <tool>}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SAMPLE_DIR="${REPO_ROOT}/samples/${SAMPLE}"
OUT_DIR="${REPO_ROOT}/report/${SAMPLE}"

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
# CodeQL takes minutes on a sample where Semgrep takes seconds, so the ceiling is generous rather than tight.
SCAN_TIMEOUT="${SCAN_TIMEOUT:-1800}"

# The exit status is captured rather than discarded.
# Scanners conventionally exit 0 for a clean run and 1 when they have findings, so neither is an error, but anything above that is.
# This matters more than it looks: a single unresolvable rule pack makes Semgrep abort the whole scan and still write a valid, empty SARIF.
# Swallowing the status would record that as "the tool found nothing", which is the exact failure mode this repository exists to catch.
RUN_STATUS=0
run() {
  timeout --signal=TERM --kill-after=30s "${SCAN_TIMEOUT}" "$@" || RUN_STATUS=$?
}

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

  codeql)
    require codeql
    CODEQL_LANGUAGE=$(node "${REPO_ROOT}/scripts/sample_meta.mjs" "${SAMPLE}" codeql-language) || {
      echo "    no codeql_language in sample.yaml, skipping" >&2
      exit 0
    }

    # CodeQL is the only two step tool here: a database is extracted first, then queried.
    # build-mode=none keeps Java and C# extractable without invoking Maven or the .NET SDK, at the documented
    # cost of guessing dependencies and skipping generated code, which is recorded in docs/tool-notes.md.
    CODEQL_DB="${SAMPLE_DIR}/.codeql-db"
    rm -rf "${CODEQL_DB}"

    # The C# extractor is a .NET program, which aborts on a machine without the ICU library, as a slim image is.
    # Invariant globalization runs it without ICU, and changes nothing of what it extracts from the code.
    export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

    run codeql database create "${CODEQL_DB}" \
      --language="${CODEQL_LANGUAGE}" \
      --build-mode=none \
      --source-root="${SAMPLE_DIR}" \
      --overwrite

    # CodeQL sizes its memory from the machine, and a container limited below it leaves the queries short of heap.
    # Three quarters of the limit go to CodeQL, the rest to the extractor and the system.
    RAM_ARGS=()
    if [ -r /sys/fs/cgroup/memory.max ] && [ "$(cat /sys/fs/cgroup/memory.max)" != max ]; then
      RAM_ARGS=(--ram="$(( $(cat /sys/fs/cgroup/memory.max) / 1048576 * 3 / 4 ))")
    fi

    if [ "${RUN_STATUS}" -eq 0 ]; then
      run codeql database analyze "${CODEQL_DB}" ${ARGS} "${RAM_ARGS[@]}" \
        --format=sarif-latest --output="${TMP}" --threads=0
    fi

    rm -rf "${CODEQL_DB}"
    ;;

  trivy)
    require trivy
    # Dependency scanning reads manifests and lock files at the sample root, not the source tree, so this is
    # the one tool that deliberately ignores scan_roots.
    # Build output is skipped: it contains a second, derived copy of the dependency graph that would be
    # reported alongside the real one and double count every finding.
    run trivy fs --scanners vuln ${ARGS} \
      --skip-dirs bin --skip-dirs obj --skip-dirs node_modules --skip-dirs target \
      --format sarif --output "${TMP}" --quiet .
    ;;

  *)
    echo "Unknown tool: ${TOOL}" >&2
    echo "Known tools: semgrep-community semgrep-custom opengrep codeql trivy bandit" >&2
    exit 1
    ;;
esac

if [ "${RUN_STATUS}" -eq 124 ] || [ "${RUN_STATUS}" -eq 137 ]; then
  echo "    ${TOOL} exceeded SCAN_TIMEOUT of ${SCAN_TIMEOUT}s, no result recorded" >&2
  rm -f "${TMP}"
  exit 1
fi

if [ "${RUN_STATUS}" -gt 1 ]; then
  echo "    ${TOOL} exited ${RUN_STATUS}, which is an error rather than a finding count." >&2
  echo "    Refusing to record the output, since an aborted scan writes an empty but valid SARIF." >&2
  rm -f "${TMP}"
  exit 1
fi

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

echo "    ${COUNT} result(s), version ${VERSION} -> report/${SAMPLE}/${TOOL}.sarif"
