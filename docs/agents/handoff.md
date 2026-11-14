# 총책임자 인수인계 (2026-11-14 새벽 갱신)

새 총책임자 대화는 이 문서 → `.planning/STATE.md`(지금 할 일, GSD) → `AGENTS.md` → `docs/agents/autopilot.md`(1-1, 4, 9번) 순서로 읽고 이어서 한다. 운영자에게는 한국어로, 쉽게, 짧게. 읽은 뒤 아래 "이어받기 첫 일"부터 한다.

## 이어받기 첫 일 (새 총책임자가 바로)
1. `list_triggers` 로 옛 총책임자 대화 `session_01TLH2dxnfHDqPeNp2Eu5L2r` 에 묶인 예약을 **전부** 이 대화로 다시 만들고(`create_trigger`, 같은 이름·시각·내용) 옛 것은 `update_trigger enabled=false`. 지금 4개:
   - 매일 순회 `CRON_TZ=Asia/Seoul 7 9 * * *` (`docs/agents/daily-routine.md` 대로)
   - 11/21 10:00 KST 케미콕 구글 계정 삭제 재시도 알림
   - 11/25 10:00 KST 토스 카드사·네이버페이 심사 확인(결제 오픈 순서표 `docs/GUIDE.md` 2-4)
   - 12/1 09:10 KST 오픈 기념 배너 점검
2. 이 문서와 `docs/agents/autopilot.md` 9번의 총책임자 대화 번호를 새 번호로 고치고 dev 에 커밋.
3. 새 대화에 Gmail·Vercel·Supabase·Windsor 커넥터와 `nyangsin-admin` 연결(`nyang_*`)이 보이는지 확인.
4. 운영자에게 "이어받았다" 한 줄 보고 → 운영자 확인 뒤 옛 대화를 `archive_session`.

## 지금 상태
- 실제 사이트(main) = PR #8(11/13 12:54 UTC)까지. 배포 직후·30분 뒤 확인 오류 0.
- 결제: 토스 카드사 심사 중(12/1 전후 예상). 실제 사이트는 토스 테스트 키라 충전·단건 결제 자리에 "결제 오픈 준비 중" 안내(e0fefaf). `live_` 키(클라이언트·시크릿 둘 다)로 바꾸면 자동으로 열림.
- 토스 예전 MID 가입비 환불: **입금 확인됨(11/14 운영자)**. 알림 예약 지움.
- 담당: 개발 opus, 나머지 sonnet, 단순 확인 haiku. 배포 뒤 확인은 직후 1번 + 30분 뒤 예약 1번. 결제·로그인·관리자·약관·DB 코드가 든 배포만 합치기 전 code-review.
- 도구: graphify(`.graphifyrc` 800 토큰), headroom 도구 결과 압축 hook, agent-browser 끝까지 시험 `scripts/e2e-smoke.sh`, GSD(`.planning/`), find-skills(`NODE_USE_ENV_PROXY=1`), mcp-builder(설치 때 비교), 관리자 조회 `nyangsin-admin`. 토스 조회는 인증 방식 문제로 보류.

## 운영자 결정 대기
1. 수능 부적 인스타 게시: **보류**(11/16 지나면 D-3 영상 다시 만들어야 할 수 있음).
2. 실제 관리자 키: Vercel `ADMIN_KEY` 는 새 값(11/14). 남은 것: 이 환경 네트워크 시크릿의 `nyangsin-admin.vercel.app` 값도 새 키로(운영자 작업, 운영실 inbox/admin-key-secret). 그 전엔 `nyang_*`(site=live) 가 401.
3. "오픈 기념" 배너는 꺼짐 확인(11/14). 인스타 프로필 링크 `?open=bujeok` 은 확인 못 함.
4. 토스 조회용 네트워크 시크릿: 지움(11/14 운영자).

## 다음 할 일 (운영자가 고른 순서)
- 결제 오픈 당일 준비: `docs/GUIDE.md` 2-4. 오픈 이벤트 기간·홍보 D+0 은 운영자 결정.
- 신년운세 시즌 점검(12/1 전): 테스트 사이트 결제~감정서, 로그인 회원, 관리자 "홈 첫 화면 주인공".
- 인스타 공격적 홍보는 결제 오픈 뒤.

## 긴 대화 줄이기 (autopilot 9번)
- 옮기지 않고 요약으로 줄인다. `.claude/settings.json` 의 `autoCompactWindow: 200000` 으로 약 16만 5천(threshold 165600)에서 저절로 요약된다(11/14). 새 작업 공간에서도 저장소 설정이라 그대로 적용. 급하면 운영자가 `/compact`. 예약·연결·대화 번호는 그대로.
- 위 "이어받기 첫 일"은 운영자가 앱에서 새 총책임자 대화를 직접 열 때만 쓴다(큰 개편 때).
- 날마다 새 순회 대화는 예약에 연결을 붙일 수 없어 막힘. 순회는 총책임자 대화에서 돈다.

## 운영자가 쓰는 명령 (대화 입력창에 그대로)
- `/compact` — 대화를 요약해 줄인다(20만 토큰 넘으면 총책임자가 부탁). 내가 답하는 중이면 취소되니 답이 끝난 뒤에. `/compact 할 일과 운영 결정 위주로` 처럼 뒤에 요약 기준을 붙일 수 있다.
- `/autocompact 200k` — 자동 요약 기준을 20만으로(저장소 설정과 같음, 지금 대화에 바로 적용).
- `/context` — 지금 대화가 얼마나 찼는지 본다. 데스크톱 앱은 오른쪽 "컨텍스트" 칸에 늘 보인다(20% = 20만 토큰이면 `/compact`).
- `/model` — 이 대화의 모델을 바꾼다.
- `/gsd:progress` — 할 일 목록(`.planning/STATE.md`) 진행 상황 요약.
- `/ponytail-help`, `/ponytail-gain` — ponytail 사용법·절감 숫자.

## 링크
- 실제 https://nyangsin.vercel.app · 관리자 https://nyangsin-admin.vercel.app
- 테스트 https://nyangsin-test.vercel.app · 테스트 관리자 https://nyangsin-test-admin.vercel.app
- 저장소 https://github.com/lyhun9914/nyangsin · 인스타 nyangsin_official
- Vercel 프로젝트 `chemickok` (prj_s8oPSZIRgNhH5KZzie1uo7VhrWeV, team_zTsoC4DzGz6SUhfWgriyCpGA) · 운영 Supabase `lykbrnfxydmsoxrcdabk`

## 배운 점 (운영자 지적·반복 작업, 한 줄씩)
- 11/13 키·비밀번호는 대화창에 붙이지 않고 입력창에만. 붙였으면 작업 공간 기록 사본에서 지우고, 실제 키는 새 값으로 바꾸길 권함.
- 11/13 운영자는 개발자가 아니다: "왜 필요한지·무슨 목적인지"를 먼저 쉬운 말로 설명하고 나서 키·결정을 묻는다.
- 11/13 대화를 옮길 때 옛 대화에 묶인 예약 작업을 전부 옮긴다.
- 11/13 담당을 기다리게 두면 깨어날 때마다 총책임자도 깨어나 긴 기록을 다시 읽는다. 결과를 받으면 바로 끝내게 하고, 나중 확인은 예약 한 번으로.
- 11/13 중계기(proxy) 방식 도구(headroom proxy, OmniRoute)는 이 클라우드에서 API 주소가 고정돼 안 통한다.
- 11/14 예약(send_later·create_trigger)으로 보낸 `/compact` 는 명령으로 실행되지 않고 글로만 온다. 자동 요약은 `autoCompactWindow` 설정으로.
- 11/14 운영자가 직접 쳐서 쓸 수 있는 유용한 명령(`/compact` 등)은 필요해지기 전에 미리 알려 준다.
- 11/14 운영자가 직접 할 일을 안내할 때는 단계마다 그 화면으로 바로 가는 링크를 넣는다(메뉴 경로만 적으면 헤맨다). Vercel 환경변수 https://vercel.com/nextone4/chemickok/settings/environment-variables · 관리자 탭 `https://nyangsin.vercel.app/admin#<탭>`(home·todo·pay·members·feedback·prices·promo·flow·errors·log·shorts) · 클라우드 환경 설정은 바로 가는 주소가 없어 대화 링크 → 대화 제목 오른쪽 ▾ → "Edit cloud environment" → "네트워크 시크릿"(실제 화면 글자, 11/14).
- 11/14 바로 가는 주소가 없는 화면 안내는 "컴퓨터 브라우저에서", 화면에 보이는 글자(영어 단추 이름 포함) 그대로, 한 줄에 한 번 누르기로 쓴다. 지우면 안 되는 것도 같이 적고, 못 찾으면 화면을 찍어 보내 달라고 한다(운영자 "설명을 봐도 모르겠어").
- 11/14 운영자 할 일·질문은 대화 대신 운영실(https://claude.ai/artifact/XQSPRjokfAn1eqFuJw6kqM) 확인함(`inbox`)에 넣고 답도 거기서 읽는다. 아티팩트 화면 DOM id 에 한국어 값을 넣으면 `_` 로 뭉개져 겹치니 ASCII 이름을 쓴다.
- 11/14 네트워크 시크릿 창(실제 화면 글자): 호스트 줄마다 ↻(값 바꾸기)·휴지통, 아래 "시크릿 추가"·"취소"·"변경사항 저장", 빨간 "환경 보관" 은 누르면 안 됨(안내에 꼭 적기).
- 11/14 정리 허락(운영자 "지워도 되는 예약은 앞으로도 알아서, 불필요한 내용도 제거"): 이 프로젝트의 꺼진·끝난 예약, 끝난 운영실 카드, 작업 공간 임시 파일, 낡은 문서 줄은 묻지 않고 지운다. 운영 DB·손님 정보·Vercel 환경변수·돈, 다른 프로젝트(TickTax·리밸런서·출금 알림) 예약·대화는 그대로 확인받는다.
