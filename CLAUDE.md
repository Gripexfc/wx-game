## Health Stack

- typecheck: skipped (no tsconfig in repo root)
- lint: skipped (no eslint/biome config in repo root)
- test: bash scripts/health-check.sh --tests-only
- deadcode: skipped (knip not configured)
- shell: bash scripts/health-check.sh --shell-only

## Health Usage

- Run full health check: `bash scripts/health-check.sh`
- Run tests only: `bash scripts/health-check.sh --tests-only`
- Run shell script lint only: `bash scripts/health-check.sh --shell-only`

