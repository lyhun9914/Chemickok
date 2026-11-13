#!/usr/bin/env bash
# 관리자 키 헤더 검사(GET 만 열리고, 틀린 키·POST 는 401).
# ADMIN_KEY=<시험 키> AUTH_SECRET=<16자 이상> AUTH_DEV_LOGIN=1 npm run dev 를 띄운 뒤
# ADMIN_KEY=<같은 시험 키> bash scripts/check-admin-bearer.sh [http://localhost:3000]
set -u
BASE="${1:-http://localhost:3000}"
fail=0
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
want() { local got; got=$(code "${@:3}"); [ "$got" = "$2" ] && echo "ok   $1 → $got" || { echo "FAIL $1 → $got (기대 $2)"; fail=1; }; }

want "GET + 맞는 키"   200 -H "Authorization: Bearer $ADMIN_KEY" "$BASE/api/admin/day"
want "GET + 키 없음"   401 "$BASE/api/admin/day"
want "GET + 틀린 키"   401 -H "Authorization: Bearer wrong-$ADMIN_KEY" "$BASE/api/admin/day"
want "POST + 맞는 키"  401 -X POST -H "Authorization: Bearer $ADMIN_KEY" -H "content-type: application/json" -d '{}' "$BASE/api/admin/errors"
want "PATCH + 맞는 키" 401 -X PATCH -H "Authorization: Bearer $ADMIN_KEY" -H "content-type: application/json" -d '{}' "$BASE/api/admin/feedback"
exit $fail
