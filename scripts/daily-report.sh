#!/usr/bin/env bash
# Daily Business Report — calls BeautyOS Tool Server
# Usage: ./daily-report.sh [base_url]
#   base_url: tool server URL (default http://localhost:3000)

BASE_URL="${1:-http://localhost:3000}"

REPORT=$(curl -s -X POST "${BASE_URL}/tools/generate_daily_report/invoke" \
  -H "Content-Type: application/json" \
  -d '{}')

if ! echo "$REPORT" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result']['summary'])" 2>/dev/null; then
  echo "❌ 日报生成失败"
  echo "$REPORT" | python3 -m json.tool 2>/dev/null || echo "$REPORT"
  exit 1
fi
