<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 작업 원칙 (운영자 요청)

- 답변은 한국어로, 한 단계씩 안내하고 링크는 눌러서 열 수 있게 준다.
- "못 한다"고 하기 전에 직접 할 방법부터 찾는다. 순서: 연결된 커넥터(Vercel·Supabase·Gmail 등) → 작업 환경 접속 허용(필요한 호스트만 승인 요청) → 자동화(Xvfb + 실제 크롬 `--remote-debugging-port` + Playwright `connectOverCDP`, 주소창까지 찍을 땐 `import -window root`) → CLI. 운영자 본인 로그인·결제 승인처럼 대신할 수 없는 일만 부탁한다.
- 코드 변경은 `dev` 브랜치(테스트 사이트)에 먼저 올린다. 실제 사이트(`main`) 배포는 운영자가 "배포해줘"라고 할 때만 한다.
- 운영 DB에는 운영자 확인 없이 지우거나 덮어쓰는 SQL을 실행하지 않는다.
- 저장소는 공개다. 개인정보·비밀 값·테스트 계정 비밀번호를 커밋하지 않는다.
