#!/usr/bin/env bash
# 손님 핵심 흐름을 진짜 브라우저(agent-browser)로 처음부터 끝까지 눌러 보는 시험.
# 사용: bash scripts/e2e-smoke.sh [주소]   (기본: 테스트 사이트)
# 주소에 nyangsin-test 가 있으면 전체(1~5번), 아니면 읽기만(1·4번 + 홈 페이지 오류 0).
# 실패가 하나라도 있으면 exit 1. 실패 스크린샷은 /tmp/e2e/<단계>.png.
URL="${1:-https://nyangsin-test.vercel.app}"; URL="${URL%/}"
SHOT=/tmp/e2e; mkdir -p "$SHOT"
SA="e2e-guest-$$"; SB="e2e-login-$$"
A="agent-browser --session $SA"
FAILS=0; T0=$SECONDS
trap 'agent-browser --session $SA close >/dev/null 2>&1; agent-browser --session $SB close >/dev/null 2>&1' EXIT

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1: $2 (스크린샷 $SHOT/$1.png)"; $A screenshot "$SHOT/$1.png" >/dev/null 2>&1; FAILS=1; }
# 페이지 오류가 없으면 0
no_errors() { local e; e=$($A errors 2>&1); if [ -n "$e" ]; then WHY="페이지 오류: $(echo "$e" | head -2 | tr '\n' ' ')"; return 1; fi; }
# 화면(접근성 트리)에 패턴이 뜰 때까지 최대 $2초 기다린다
waitfor() { local i; for i in $(seq 1 $(( ${2:-10} * 2 ))); do $A snapshot -i 2>&1 | grep -q "$1" && return 0; sleep 0.5; done; return 1; }
click() { $A find role button click --name "$1" >/dev/null 2>&1; }
# 가로 넘침 없음 (폭 $1 x $2)
no_overflow() { $A set viewport "$1" "$2" >/dev/null 2>&1; sleep 1; [ "$($A eval 'document.documentElement.scrollWidth <= innerWidth' 2>&1)" = true ]; }
# 열린 복주머니 창의 냥 수
coins() { $A get text '[role=dialog]' 2>/dev/null | tr -d '\n ' | grep -o '들어있는냥[0-9]*냥' | grep -o '[0-9]*'; }

# 면담을 시험 값으로 끝까지 답하고 결과 화면("전부 열기" 버튼)까지 간다. 답이 막히면 1.
# shortcut: 첫 번째 보기를 고르는 방식이라 질문 순서가 바뀌어도 되지만, 입력칸 종류가 새로 생기면 멈춘다(STUCK).
interview() {
  local i S R last="" same=0 b
  local Y=$((1980 + RANDOM % 25)) M=$((1 + RANDOM % 12)) D=$((1 + RANDOM % 28))
  for i in $(seq 1 90); do
    S=$($A snapshot -i 2>&1)
    echo "$S" | grep -q 'button ".*전부 열기' && return 0
    R=$(echo "$S" | grep -v 'option "' | grep -v '\[disabled' | grep -v '나가기\|소리 끄기\|generic\|방금 답\|이용약관\|개인정보\|고객문의\|홈 화면\|고양이 도감\|내 복주머니\|내 점괘함')
    if [ "$R" = "$last" ]; then same=$((same+1)); else same=0; fi; last="$R"
    [ $same -ge 15 ] && { WHY="면담이 멈춤: $(echo "$R" | head -2 | cut -c1-80 | tr '\n' ' ')"; return 1; }
    if echo "$R" | grep -q 'combobox "년"'; then
      $A select "select[aria-label='년']" "${Y}년" >/dev/null 2>&1; $A select "select[aria-label='월']" "${M}월" >/dev/null 2>&1; $A select "select[aria-label='일']" "${D}일" >/dev/null 2>&1
      click "확인"; sleep 1.5; continue
    fi
    if echo "$R" | grep -q 'textbox'; then
      $A find role textbox fill "김시험" >/dev/null 2>&1; click "보내기"; sleep 1.5; continue
    fi
    b=$(echo "$R" | grep -m1 '한 번에 다 보기' | sed 's/^[^"]*"//;s/" \[ref.*$//;s/\\//g')
    # 보기가 3개 이상이면 무작위로 고른다(답이 같으면 이미 산 점괘라 냥이 안 빠진다). 2개(면담 종류)·1개는 첫 번째.
    if [ -z "$b" ]; then
      b=$(echo "$R" | grep 'button "' | { if [ "$(echo "$R" | grep -c 'button "')" -ge 3 ]; then shuf -n1; else head -1; fi; } | sed 's/^[^"]*"//;s/" \[ref.*$//;s/\\//g')
    fi
    [ -z "$b" ] && { sleep 1.5; continue; }
    click "$b"; sleep 1.5
  done
  WHY="면담이 90번 눌러도 안 끝남"; return 1
}

# ---------- 1. 홈 ----------
S=1-홈; WHY=""; $A open "$URL" >/dev/null 2>&1; $A set viewport 390 844 >/dev/null 2>&1; $A errors --clear >/dev/null 2>&1; $A open "$URL" >/dev/null 2>&1
if ! waitfor 'heading .*level=1' 15; then WHY="첫 화면 제목이 안 뜸"
elif ! $A snapshot -i 2>&1 | grep -q 'button ".*무료'; then WHY="'무료' 점괘 버튼이 안 보임"
elif ! no_overflow 390 844; then WHY="390px 에서 가로 넘침"
elif ! no_overflow 360 800; then WHY="360px 에서 가로 넘침"
else no_errors; fi
[ -z "$WHY" ] && pass $S || fail $S "$WHY"
$A set viewport 390 844 >/dev/null 2>&1

if [[ "$URL" == *nyangsin-test* ]]; then
  # ---------- 2. 무료 연애 점괘 끝까지 ----------
  S=2-무료점괘; WHY=""; $A errors --clear >/dev/null 2>&1; $A open "$URL" >/dev/null 2>&1
  if ! { waitfor '연애 점괘 바로 보기' 10 && click "연애 점괘 바로 보기"; }; then WHY="홈의 무료 버튼을 못 누름"
  elif ! interview; then :
  else no_errors; fi
  [ -z "$WHY" ] && pass $S || fail $S "$WHY"

  # ---------- 3. 전부 열기 -> 로그인 없이 결제 칸 (누르지 않음) ----------
  S=3-결제칸; WHY=""; $A errors --clear >/dev/null 2>&1
  if ! click "전부 열기"; then WHY="'전부 열기' 버튼이 없음"
  elif ! { waitfor '로그인 없이 이 점괘만' 8 && click "로그인 없이 이 점괘만"; }; then WHY="'로그인 없이 결제' 선택지가 없음"
  elif ! waitfor 'dialog "복채 내기"' 8; then WHY="결제 칸이 안 열림"
  elif ! $A snapshot -i -s '[role=dialog]' 2>&1 | grep -q 'button "토스페이"'; then WHY="결제 수단이 안 보임"
  elif ! $A snapshot -i -s '[role=dialog]' 2>&1 | grep -q 'button "복채 .*내고'; then WHY="'복채 … 내고' 버튼이 안 보임"
  else no_errors; fi
  [ -z "$WHY" ] && pass $S || fail $S "$WHY"
fi

# ---------- 4. 가격 안내 ----------
S=4-가격안내; WHY=""; $A errors --clear >/dev/null 2>&1; $A open "$URL/pricing" >/dev/null 2>&1
if ! waitfor 'heading "요금 안내"' 10; then WHY="/pricing 제목이 안 뜸"
elif ! $A snapshot 2>&1 | grep -q 'columnheader'; then WHY="가격 표가 없음"
else no_errors; fi
[ -z "$WHY" ] && pass $S || fail $S "$WHY"

if [[ "$URL" == *nyangsin-test* ]]; then
  # ---------- 5. 개발용 로그인 -> 충전 -> 유료 감정서 -> 냥 -1 (새 브라우저로) ----------
  A="agent-browser --session $SB"
  S=5-로그인충전열기; WHY=""; $A open "$URL" >/dev/null 2>&1; $A set viewport 390 844 >/dev/null 2>&1; $A errors --clear >/dev/null 2>&1
  if ! { waitfor 'button "로그인"' 12 && click "로그인"; }; then WHY="로그인 버튼이 없음"
  elif ! { waitfor '개발용 테스트 로그인' 8 && click "개발용 테스트 로그인"; }; then WHY="개발용 로그인이 없음 (AUTH_DEV_LOGIN 꺼짐?)"
  elif ! { waitfor 'button "내 복주머니"' 12 && click "내 복주머니"; }; then WHY="로그인 뒤 복주머니가 없음"
  else
    sleep 1; B0=$(coins)
    $A find role checkbox check >/dev/null 2>&1
    if [ -z "$B0" ]; then WHY="복주머니 냥 수를 못 읽음"
    elif ! click "충전하기"; then WHY="충전 버튼을 못 누름(약관 동의 체크 확인)"
    else
      sleep 3; B1=$(coins)
      if [ -z "$B1" ] || [ "$B1" -le "$B0" ]; then WHY="충전 뒤 냥이 안 늚 ($B0 -> ${B1:-?})"
      else
        click "닫기"; sleep 1
        if ! { waitfor '연애 점괘 바로 보기' 8 && click "연애 점괘 바로 보기"; }; then WHY="홈의 무료 버튼을 못 누름"
        elif ! interview; then :
        elif ! click "전부 열기"; then WHY="'전부 열기' 버튼이 없음"
        else
          waitfor 'checkbox' 8; $A find role checkbox check >/dev/null 2>&1
          if ! click "내고 전부 듣기"; then WHY="결제 칸의 '내고 전부 듣기' 버튼을 못 누름"
          elif ! { for _ in $(seq 1 30); do $A snapshot -i 2>&1 | grep -q '전부 열기\|dialog "복채' || break; sleep 0.5; done; ! $A snapshot -i 2>&1 | grep -q '전부 열기'; }; then WHY="유료 감정서가 안 열림"
          else
            click "다른 사람 점괘도 보기"; sleep 2; click "내 복주머니"
            for _ in 1 2 3 4 5 6; do sleep 1; B2=$(coins); [ "$B2" = "$((B1-1))" ] && break; done
            [ "$B2" = "$((B1-1))" ] || WHY="냥이 1 줄지 않음 ($B1 -> ${B2:-?})"
          fi
        fi
      fi
    fi
  fi
  [ -z "$WHY" ] && { no_errors || true; }
  [ -z "$WHY" ] && pass $S || fail $S "$WHY"
fi

echo "걸린 시간 $((SECONDS-T0))초"
[ "$FAILS" = 0 ] && echo "전부 PASS" || echo "실패 있음"
exit $FAILS
