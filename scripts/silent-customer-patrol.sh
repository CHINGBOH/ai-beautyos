#!/usr/bin/env bash
# Silent Customer Patrol — calls BeautyOS Tool Server
# Usage: ./silent-customer-patrol.sh [base_url] [cold_days]

BASE_URL="${1:-http://localhost:3000}"
COLD_DAYS="${2:-30}"

REPORT=$(curl -s -X POST "${BASE_URL}/tools/generate_silent_customer_report/invoke" \
  -H "Content-Type: application/json" \
  -d "{\"input\":{\"coldDaysThreshold\":${COLD_DAYS}}}")

if ! echo "$REPORT" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result']['summary'])" 2>/dev/null; then
  echo "❌ 沉默客户巡检失败"
  echo "$REPORT" | python3 -m json.tool 2>/dev/null || echo "$REPORT"
  exit 1
fi
