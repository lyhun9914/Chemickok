# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-13)

**Core value:** 무료 점괘로 재미 → 결제로 전체 감정서
**Current focus:** 결제 오픈 준비 + 담당 도구 정비

## Current Position

Status: In progress
Last activity: 2026-11-13 — PR #6(headroom 압축) 실제 사이트 배포, agent-browser 끝까지 시험 스크립트 개발 담당에게 맡김

## 할 일 (총책임자가 하나 끝날 때마다 고친다)

- [x] `scripts/e2e-smoke.sh` (7e1685e): 테스트 5단계 PASS(약 2분 50초), 실제 읽기 2단계 PASS(8초). 점검(시작 때)·개발(흐름 고친 뒤)·배포(올린 직후) 규칙에 연결
- [x] 면담 중복 판단 확인: 버그 아님(개발용 로그인이 늘 같은 회원·저장된 생일이라 시험이 같은 입력이 됨). 생일·성별·상대 하나라도 다르면 냥 다시 빠짐, 회원끼리 안 섞임
- [ ] **배포 대기(운영자 확인, 급하지 않음)** 신년운세 해(年)를 결제 키에 넣음 `15a5f3e` — 안 고치면 2027-10-01 부터 2028 신년운세가 같은 답이면 냥 없이 열림. 2027-09-30 까지 배포하면 됨
- [ ] 작은 것: e2e 5단계는 같은 회원이라 답이 우연히 같으면 실패할 수 있음 / 재회는 성별만 바꾸면 같은 풀이에 냥이 한 번 더 빠짐(드묾)
- [ ] **mcp-builder 연결 (운영자 11/13)** 토스 조회·냥신 관리자 API, 둘 다 읽기 전용
  - [x] 개발 담당: `mcp/toss`(2 도구), `mcp/nyangsin-admin`(6 도구) + `.mcp.json` + 관리자 GET 키 헤더(admin.ts, 틀린 키는 감사 기록) + README 7번 "새 연결 만들기" (f9811e9)
  - [x] 테스트 사이트 ADMIN_KEY 를 실제 사이트와 같은 값으로(운영자 요청 11/13, Vercel preview·dev). 실제 관리자 키는 네트워크 비밀에 저장됨
  - [x] 테스트 관리자 키 저장 → 테스트 사이트 /api/admin 200, nyang_stats(site=test) 정상(239자)
  - [ ] **보류** 토스 조회: 개별 연동 test_sk 키를 Basic(사용자 이름=키)으로 저장해도 401. 네트워크 비밀 목록에 토스만 헤더 이름이 없어 Basic 방식이 요청에 안 붙는 것으로 보임. 결제 오픈 때 다시(운영자에게 토스 비밀은 지우길 권함: 남아 있으면 이 환경의 토스 결제 시험 요청을 덮어씀)
  - [ ] 운영자에게 권함: 대화에 붙여 넣은 실제 관리자 키는 결제 오픈 전 새 값으로 교체
  - [ ] 새 대화에서 두 MCP 서버가 뜨는지(.mcp.json 의 ${CLAUDE_PROJECT_DIR:-.} 경로) 확인
  - [ ] 맡김(배포 담당): 운영자 "배포해줘"(11/13) → PR·실제 사이트 배포, e2e 읽기 시험, 실제 관리자 키 200 확인, 30분 오류 확인
  - [x] 앞으로: 처음 하는 일은 있는 도구 → find-skills → mcp-builder 순서(공통 규칙 10, autopilot 9). skills.sh 네트워크 허용, 검색은 `NODE_USE_ENV_PROXY=1` 필요
  - [x] README 6번 표 find-skills 설치 문구를 규칙 10 기준으로
- [ ] **운영자 보류** 수능 부적 인스타 게시 (① 따로 예약 / ② 순회 때). 11/16 지나면 D-3 영상 다시 만들어야 할 수 있음
- [ ] **운영자 작업(안내함)** 실제 사이트 "오픈 기념" 배너 끄기, 인스타 프로필 링크 `?open=bujeok`
- [ ] **다음** 결제 오픈 당일 준비 — `docs/GUIDE.md` 2-4. 오픈 이벤트 기간·홍보 D+0 은 운영자 결정
- [ ] **다음** 신년운세 시즌 점검(12/1 전) — 테스트 사이트 결제~감정서, 로그인 회원, 관리자 "홈 첫 화면 주인공"

## Accumulated Context

### Decisions

PROJECT.md Key Decisions 참고.

### Pending Todos

예약 작업(이 대화로 옴): 매일 09:07 순회 · 11/17 토스 예전 MID 환불 확인 · 11/21 케미콕 구글 계정 삭제 · 11/25 카드사 심사 확인 · 12/1 오픈 배너 점검

### Blockers/Concerns

- 실제 사이트 토스 키가 아직 test_ (카드사 심사 중, 12/1 전후 예상)

## Session Continuity

Last session: 2026-11-13 (총책임자 `session_01TLH2dxnfHDqPeNp2Eu5L2r`)
Stopped at: e2e 시험 스크립트 결과 대기
Resume file: None
