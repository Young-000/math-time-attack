#!/usr/bin/env bash
# verify.sh — 야간 자율 사이클 검증 스크립트
# 용법: bash scripts/verify.sh
# 출력: VERIFY: GREEN (exit 0) | VERIFY: RED (exit 1)

set -uo pipefail

FAIL=0
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "=== $1 ==="; }
ok()   { echo "✅ PASS: $1"; }
fail() { echo "❌ FAIL: $1"; FAIL=1; }

# 1. TypeScript 타입 검사
step "typecheck"
if npm run typecheck 2>&1; then
  ok "typecheck"
else
  fail "typecheck"
fi

# 2. ESLint
step "lint"
if npm run lint 2>&1; then
  ok "lint"
else
  fail "lint"
fi

# 3. 단위 테스트 (run 모드 — watch 금지)
step "test"
if npm run test -- --run 2>&1; then
  ok "test"
else
  fail "test"
fi

# 4. 프로덕션 빌드
step "build"
if npm run build 2>&1; then
  ok "build"
else
  fail "build"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "VERIFY: GREEN"
  exit 0
else
  echo "VERIFY: RED"
  exit 1
fi
