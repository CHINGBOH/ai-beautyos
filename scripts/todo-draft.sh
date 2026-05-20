#!/usr/bin/env bash
# Daily Todo Draft — calls BeautyOS Tool Server
# Usage: ./todo-draft.sh [base_url]

BASE_URL="${1:-http://localhost:3000}"

REPORT=$(curl -s -X POST "${BASE_URL}/tools/generate_todo_draft/invoke" \
  -H "Content-Type: application/json" \
  -d '{}')

if ! echo "$REPORT" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result']['summary'])" 2>/dev/null; then
  echo "❌ 待办清单生成失败"
  echo "$REPORT" | python3 -m json.tool 2>/dev/null || echo "$REPORT"
  exit 1
fi
