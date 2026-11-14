# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-13)

**Core value:** 무료 점괘로 재미 → 결제로 전체 감정서
**Current focus:** 결제 오픈 준비 + 담당 도구 정비

## Current Position

Status: In progress
Last activity: 2026-11-14 — 운영실 했음 4건 처리: 꺼진 옛 예약 6개 지움, 토스 네트워크 시크릿 지운 것 확인, "오픈 기념" 배너 꺼진 것 확인, Vercel ADMIN_KEY 새 값 확인. 테스트 관리자 키도 같은 새 값으로(dev 전용 옛 ADMIN_KEY 를 안 쓰는 브랜치 `claude/more-tools` 로 옮김, 운영자 "테스트관리자키도 똑같이"). 남은 것: 네트워크 시크릿 두 줄(실제·테스트 관리자) 새 키로(운영실 inbox/admin-key-secret, 그 전엔 nyang_* live·test 401). 정리 허락 문서화(README 4-11, 순회 6번)

## 할 일 (총책임자가 하나 끝날 때마다 고친다)

- [x] **운영실 아티팩트 (운영자 "추천하는 방식으로 완벽하게" 11/14)** https://claude.ai/artifact/XQSPRjokfAn1eqFuJw6kqM (비공개·고정). 탭: 운영자 확인함(`inbox`, 했음·보류·질문 + 부탁 남기기, 누르면 예약 trig_01HVgAdNDA2mpCy7EDeQL8Q6 으로 총책임자에게 바로 알림) · 홍보 승인판(`promo`, 승인·고쳐줘) · 아침 상황판(숫자만, 읽기) · 바로가기. 운영자만 읽고 씀(보기·참여 권한 쓰기 거절 확인). 키·비밀번호·손님 이메일·전화 안 넣음. 순회가 매일 읽고 씀(`docs/agents/daily-routine.md` 2·5번). 연결마다 처음 한 번 허락 창이 뜸. 못 본 것: 휴대폰 앱 화면, Vercel 오류가 있을 때의 글 모양
  - 확인함: `admin-key`·`toss-secret`·`old-triggers`·`banner-insta` 끝(11/14) · `admin-key-secret` 대기 · `suneung-post` 대기
  - [ ] **다음** 결제 오픈 체크리스트 탭(12/1 쯤)
- [x] `scripts/e2e-smoke.sh` (7e1685e): 테스트 5단계 PASS(약 2분 50초), 실제 읽기 2단계 PASS(8초). 점검(시작 때)·개발(흐름 고친 뒤)·배포(올린 직후) 규칙에 연결
- [x] 면담 중복 판단 확인: 버그 아님(개발용 로그인이 늘 같은 회원·저장된 생일이라 시험이 같은 입력이 됨). 생일·성별·상대 하나라도 다르면 냥 다시 빠짐, 회원끼리 안 섞임
- [x] PR #8 실제 사이트 배포(12:54 UTC): 신년운세 해(年) 결제 키 `15a5f3e` + 전체 검토 적용분. e2e PASS, 오류 0. 30분 뒤 확인은 send_later 예약(13:25 UTC)
- [x] PR #9 실제 사이트 배포(11/14): 문서·설정만(사이트 코드 변경 없음). 홈 200, e2e 읽기 PASS, 오류 0. 30분 뒤 확인 안 함
- [x] PR #10 main 합침(11/14 02:41 KST): 자동 요약 설정·문서만. Vercel 이 main 새 빌드를 안 만듦(6분 기다림, dev 미리보기는 정상). 사이트 코드가 PR #9 와 같아 영향 없음, 홈 200. 다음 코드 배포 때 production 빌드가 생기는지 확인
- (참고) 신년운세 해 키 — 안 고치면 2027-10-01 부터 2028 신년운세가 같은 답이면 냥 없이 열림. 2027-09-30 까지 배포하면 됨
- [ ] 작은 것: e2e 5단계는 같은 회원이라 답이 우연히 같으면 실패할 수 있음 / 재회는 성별만 바꾸면 같은 풀이에 냥이 한 번 더 빠짐(드묾)
- [ ] **mcp-builder 연결 (운영자 11/13)** 토스 조회·냥신 관리자 API, 둘 다 읽기 전용
  - [x] 개발 담당: `mcp/toss`(2 도구), `mcp/nyangsin-admin`(6 도구) + `.mcp.json` + 관리자 GET 키 헤더(admin.ts, 틀린 키는 감사 기록) + README 7번 "새 연결 만들기" (f9811e9)
  - [x] 테스트 사이트 ADMIN_KEY 를 실제 사이트와 같은 값으로(운영자 요청 11/13). 11/14 부터 dev 전용 값 없이 실제와 같은 ADMIN_KEY(production+preview) 하나를 씀 → 키를 바꾸면 둘 다 바뀜. 옛 dev 전용 값은 `claude/more-tools` 브랜치로 옮겨 둠(안 쓰임, Vercel 에서 지워도 됨)
  - [x] 테스트 관리자 키 저장 → 테스트 사이트 /api/admin 200, nyang_stats(site=test) 정상(239자)
  - [ ] **보류** 토스 조회: 개별 연동 test_sk 키를 Basic(사용자 이름=키)으로 저장해도 401. 네트워크 비밀 목록에 토스만 헤더 이름이 없어 Basic 방식이 요청에 안 붙는 것으로 보임. 결제 오픈 때 다시(토스 네트워크 시크릿은 11/14 운영자가 지움)
  - [ ] 새 대화에서 두 MCP 서버가 뜨는지(.mcp.json 의 ${CLAUDE_PROJECT_DIR:-.} 경로) 확인
  - [x] PR #7 실제 사이트 배포: 관리자 조회 /api/admin/day 200, e2e PASS, 오류 0
  - [x] 앞으로: 처음 하는 일은 있는 도구 → find-skills → mcp-builder 순서(공통 규칙 10, autopilot 9). skills.sh 네트워크 허용, 검색은 `NODE_USE_ENV_PROXY=1` 필요
  - [x] README 6번 표 find-skills 설치 문구를 규칙 10 기준으로
- [x] **전체 검토 1~6 적용 (운영자 "전부 적용해줘" 11/13)**
  - [x] 1 담당 파일에 "먼저 쓰는 도구" (운영·고객·홍보·점검·글)
  - [x] 2 마케팅·고객지원·supabase 플러그인 스킬만 저장소로, 플러그인 끄기(라이선스 확인)
  - [x] 3 GSD 모델 balanced
  - [x] 4 홍보 영상·이미지 도구 순서 (1 에 포함)
  - [x] 5 task-observer 끄기 → handoff "배운 점"
  - [x] 6 토스 조회 연결 등록 빼기(코드 유지)
- [ ] **대화 정리 (운영자 11/13 "바꿔줘")** 운영·예약이 끊기면 안 됨
  - [x] a 순회 지시서 `docs/agents/daily-routine.md` (새 순회 대화가 읽음, 끝나면 정리 규칙 포함)
  - [x] b 대화 옮기는 법·기준(autopilot 9번): 40만 토큰 또는 7일, 예약 작업 전부 옮기기
  - [ ] c 매일 순회 새 대화: **막힘** — 예약으로 열린 대화에 Claude Code Remote 연결이 없어 새 대화를 못 엶(11/13 시험 2번 실패, 실패 알림 푸시됨). 도구로 연결을 붙이는 기능이 이 계정에 없음 → 운영자가 루틴 화면에서 만들거나, 순회는 총책임자 대화에 두고 총책임자를 20만 토큰마다 옮김(지금 방식). 기존 09:07 예약은 살아 있음
  - [x] d 새 대화로 옮기기 대신 `/compact` 로 줄이기로(11/14 운영자와 정함). 시험으로 연 새 대화는 연결 이름이 달라 보이고 첫 지시를 운영자 말로 안 받아 멈춤 → 보관
  - [x] e 자동 요약: `.claude/settings.json` `autoCompactWindow: 200000`(11/14). 예약으로 보낸 /compact 는 글로만 와서 실패 → 예약 지움. 이 대화엔 운영자가 `/autocompact 200k` 입력 → threshold 165600(source settings) 확인 11/14
- [ ] **운영자 작업** 실제 관리자 키: Vercel ADMIN_KEY 새 값 됨(11/14). 테스트도 같은 값(11/14). 남은 것: 클라우드 환경 네트워크 시크릿 `nyangsin-admin.vercel.app`·`nyangsin-test-admin.vercel.app` 두 줄 다 새 키로(↻ → 붙여넣기 → 변경사항 저장). 11/14 01:10·01:30 운영자 했음, 키는 맞지만(로그인 OK) 시크릿 값 앞 `Bearer ` 가 빠져 live·test 둘 다 401(빠른 401) → ↻ 로 `Bearer 키` 다시 넣기 안내(운영실 카드 v5). 했다고 하면 `nyang_day` live·test 200 확인 (운영실 inbox/admin-key-secret)
- [ ] **운영자 보류** 수능 부적 인스타 게시 (① 따로 예약 / ② 순회 때). 11/16 지나면 D-3 영상 다시 만들어야 할 수 있음 (운영실 inbox/suneung-post)
- [x] "오픈 기념" 배너 끄기: 실제 사이트 banner null 확인(11/14). 인스타 프로필 링크는 확인 못 함
- [ ] **다음** 결제 오픈 당일 준비 — `docs/GUIDE.md` 2-4. 오픈 이벤트 기간·홍보 D+0 은 운영자 결정
- [ ] **다음** 신년운세 시즌 점검(12/1 전) — 테스트 사이트 결제~감정서, 로그인 회원, 관리자 "홈 첫 화면 주인공"

## Accumulated Context

### Decisions

PROJECT.md Key Decisions 참고.

### Pending Todos

예약 작업(이 총책임자 대화에 묶임): 매일 09:07 순회 · 11/25 카드사 심사 확인 · 12/1 오픈 배너 점검. 11/17 토스 환불 확인은 입금 확인돼 지움, 11/21 케미콕 구글 계정 삭제 알림은 운영자가 11/14 삭제 끝내 지움

### Blockers/Concerns

- 실제 사이트 토스 키가 아직 test_ (카드사 심사 중, 12/1 전후 예상)

## Session Continuity

Last session: 2026-11-13 (총책임자 `session_01TLH2dxnfHDqPeNp2Eu5L2r`)
Stopped at: 운영실 완성, 운영자 답(운영실 확인함 5건) 대기
Resume file: None
