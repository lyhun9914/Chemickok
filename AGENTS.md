<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 작업 원칙 (운영자 요청)

- 답변은 한국어로, 한 단계씩 안내하고 링크는 눌러서 열 수 있게 준다.
- "못 한다"고 하기 전에 직접 할 방법부터 찾는다. 순서: 연결된 커넥터(Vercel·Supabase·Gmail 등) → 작업 환경 접속 허용(필요한 호스트만 승인 요청) → 자동화(Xvfb + 실제 크롬 `--remote-debugging-port` + Playwright `connectOverCDP`, 주소창까지 찍을 땐 `import -window root`) → CLI. 운영자 본인 로그인·결제 승인처럼 대신할 수 없는 일만 부탁한다.
- 코드 변경은 `dev` 브랜치(테스트 사이트)에 먼저 올린다. 실제 사이트(`main`) 배포는 운영자가 "배포해줘"라고 할 때, 또는 운영실이 `docs/agents/autopilot.md` 의 "자동 배포" 조건을 모두 만족할 때만 한다.
- 운영 DB에는 운영자 확인 없이 지우거나 덮어쓰는 SQL을 실행하지 않는다.
- 저장소는 공개다. 개인정보·비밀 값·테스트 계정 비밀번호를 커밋하지 않는다.

## 역할별 에이전트 (운영자 요청)

냥신 점괘 일은 담당별 에이전트로 나눠서 한다. 정의는 `.claude/agents/`, 공통 규칙과 쓰는 법은 `docs/agents/README.md` 에 있다.

| 운영자가 부르는 말 | 에이전트 | 맡는 일 |
| --- | --- | --- |
| 개발 담당 | `nyang-dev` | 기능 추가, 버그 수정, 화면 변경, DB 구조 추가 (dev 까지) |
| 점검 담당 | `nyang-qa` | 테스트 사이트를 손님처럼 눌러 보고 통과·실패 보고 |
| 배포 담당 | `nyang-release` | "배포해줘"가 있을 때 실제 사이트에 올리고 확인 |
| 운영 담당 | `nyang-ops` | 실제 사이트 오류·결제·매일 작업 살피기 (읽기만) |
| 고객 담당 | `nyang-cs` | 문의 답장, 건의함·평가 정리, 환불 판단(운영자 확인 뒤 처리) |
| 글 담당 | `nyang-writer` | 점괘 풀이, 질문, 화면 문구, 안내문 (dev 까지) |
| 홍보 담당 | `nyang-marketing` | 인스타 기획·제작, 주간 승인 뒤 자동 게시, 댓글 |

- 운영자가 담당을 부르면(예: "점검 담당한테 시켜줘") 그 에이전트에게 맡기고, 결과를 운영자가 읽기 쉽게 정리해 전한다.
- 담당을 부르지 않은 일은 메인이 직접 하되, 그 일을 맡는 담당 파일의 규칙을 그대로 따른다.
- 한 담당의 결과가 다른 담당의 일로 이어지면(개발 → 점검처럼) 다음에 누구에게 넘길지 운영자에게 알린다.
- 실제 사이트 배포는 배포 담당만 한다. 운영자가 "배포해줘"라고 했을 때, 또는 운영실에서 `docs/agents/autopilot.md` 의 "자동 배포" 조건(점검 통과, 운영 DB 변경 없음, 결제·로그인·냥·관리자·약관 코드 아님, 새 기능 아님)을 모두 만족할 때다.
- 지휘 체계: 운영자와 대화하는 메인 대화가 **총책임자**, 🐾 냥신 운영실이 **실무팀**, 담당 에이전트가 **직원**이다. 총책임자는 실무를 운영실에 맡기고 보고를 받는다 (`docs/agents/autopilot.md` 9번).
- 예약 작업으로 깨어난 운영실 대화는 `docs/agents/autopilot.md` 를 따른다. 알아서 해도 되는 것과 운영자에게 확인받을 것이 거기 정해져 있다.
