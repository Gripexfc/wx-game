#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Dual mainline regression =="
echo "[1/3] 成长主线回归"
node tests/GameCompleteGoal.test.js

echo "[2/3] 任务与目标管理回归"
node tests/GoalManager.test.js

echo "[3/3] 心愿与任务协同回归"
node tests/WishManager.test.js

echo
echo "Dual-mainline regression: PASS"
