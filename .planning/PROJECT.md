# 냥신 점괘

## What This Is

고양이 점집 컨셉의 사주·궁합·연애 점괘 웹 서비스(https://nyangsin.vercel.app). 무료 맛보기와 냥(복채)으로 여는 유료 감정서. 운영자 1명 + 총책임자 대화 + 담당 에이전트(`.claude/agents/nyang-*`).

## Core Value

손님이 무료 점괘로 재미를 느끼고, 결제(냥 충전·바로 결제)로 전체 감정서를 연다.

## Requirements

### Validated

- 홈 개편 B안, 무료·유료 점괘, 냥 충전(토스), 관리자 화면 — 실제 사이트 운영 중

### Active

- 토스 카드사 심사 뒤 결제 오픈 (`docs/GUIDE.md` 2-4 순서표)
- 신년운세 시즌(12/1) 점검

### Out of Scope

- 결제 오픈 전 인스타 공격적 홍보 (운영자 결정 11/13)

## Context

- 규칙: `AGENTS.md`, `docs/agents/README.md`, `docs/agents/autopilot.md`. 사람용 인계: `docs/agents/handoff.md`.
- 브랜치: `dev`(테스트 사이트) → PR → `main`(실제 사이트).

## Constraints

- 돈·배포·운영 DB 쓰기·환경변수·인스타 게시는 운영자 확인(`docs/agents/autopilot.md` 4번).
- 저장소 공개: 비밀 값·개인정보 금지. `.planning/` 도 공개된다.

## Key Decisions

| 날짜 | 결정 |
| --- | --- |
| 11/13 | 총책임자가 담당을 직접 부름(운영실 대화 없음) |
| 11/13 | 결제 오픈 전엔 충전·바로 결제 "준비 중" 차단 |
| 11/13 | 수능 부적 인스타 게시 보류 |
| 11/13 | 긴 대화는 GSD(`.planning/STATE.md`)로 쪼개 기록 |
