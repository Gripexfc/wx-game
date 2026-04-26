#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-full}"

run_tests() {
  local start end duration total passed failed
  start=$(date +%s)
  total=0
  passed=0
  failed=0

  echo "== Running JS tests =="
  for f in tests/*.test.js; do
    total=$((total + 1))
    if node "$f" >/tmp/health-test.log 2>&1; then
      passed=$((passed + 1))
      echo "PASS $f"
    else
      failed=$((failed + 1))
      echo "FAIL $f"
      tail -20 /tmp/health-test.log || true
    fi
  done

  end=$(date +%s)
  duration=$((end - start))

  echo
  echo "TEST SUMMARY: $passed/$total passed, $failed failed (${duration}s)"

  if [ "$failed" -eq 0 ]; then
    echo "TEST SCORE: 10/10"
  else
    echo "TEST SCORE: 7/10"
    return 1
  fi
}

run_shell_lint() {
  local count issues score
  count=0
  issues=0
  score=10

  echo "== Running shell lint =="
  while IFS= read -r sh_file; do
    count=$((count + 1))
    if command -v shellcheck >/dev/null 2>&1; then
      if ! shellcheck "$sh_file"; then
        issues=$((issues + 1))
      fi
    else
      echo "SKIP shellcheck missing, cannot lint: $sh_file"
      score=0
    fi
  done < <(find . -type f -name "*.sh" -not -path "./.git/*")

  if [ "$count" -eq 0 ]; then
    echo "No shell scripts found."
    echo "SHELL SCORE: skipped"
    return 0
  fi

  if [ "$score" -eq 0 ]; then
    echo "SHELL SCORE: skipped (shellcheck not installed)"
    return 0
  fi

  if [ "$issues" -eq 0 ]; then
    echo "SHELL SCORE: 10/10"
  elif [ "$issues" -lt 5 ]; then
    echo "SHELL SCORE: 7/10 ($issues files with issues)"
  else
    echo "SHELL SCORE: 4/10 ($issues files with issues)"
  fi
}

case "$MODE" in
  --tests-only)
    run_tests
    ;;
  --shell-only)
    run_shell_lint
    ;;
  full|"")
    run_tests || true
    echo
    run_shell_lint || true
    ;;
  *)
    echo "Usage: bash scripts/health-check.sh [--tests-only|--shell-only]"
    exit 1
    ;;
esac

