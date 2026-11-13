# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-13)

**Core value:** 무료 점괘로 재미 → 결제로 전체 감정서
**Current focus:** 결제 오픈 준비 + 담당 도구 정비

## Current Position

Status: In progress
Last activity: 2026-11-13 — PR #6(headroom 압축) 실제 사이트 배포, agent-browser 끝까지 시험 스크립트 개발 담당에게 맡김

## 할 일 (총책임자가 하나 끝날 때마다 고친다)

- [ ] **맡김(개발 담당)** `scripts/e2e-smoke.sh` — agent-browser 로 손님 핵심 흐름 끝까지 시험. 받으면: 두 사이트 PASS 확인 → 점검(시작 때)·개발(화면 고친 뒤)·배포(올린 직후) 담당 규칙에 연결 → 커밋
- [ ] **mcp-builder 연결 (운영자 11/13)** 토스 조회·냥신 관리자 API, 둘 다 읽기 전용
  - [x] 개발 담당: `mcp/toss`(2 도구), `mcp/nyangsin-admin`(6 도구) + `.mcp.json` + 관리자 GET 키 헤더(admin.ts, 틀린 키는 감사 기록) + README 7번 "새 연결 만들기" (f9811e9)
  - [ ] 키 입력창 띄우기: 토스 api.tosspayments.com Basic(사용자=시크릿 키, 비밀번호 비움) / 관리자 nyangsin-admin.vercel.app·nyangsin-test-admin.vercel.app Bearer(각 사이트 ADMIN_KEY)
  - [ ] 새 대화에서 두 MCP 서버가 뜨는지(.mcp.json 의 ${CLAUDE_PROJECT_DIR:-.} 경로) 확인
  - [ ] 관리자 코드라 실제 사이트 배포는 운영자 확인 뒤
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
