## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## 공통 규칙

- 사용자에게 보이는 모든 글은 항상 한국어로 쓴다. 코드, 명령어, 파일 이름은 원래대로 둔다.
- 바로 할 수 있는 일은 묻지 말고 한다. 되돌리기 어렵거나 돈·외부 게시·고객 연락이 걸린 일만 먼저 확인한다.
- 서로 관계없는 조회는 병렬로 실행하고, 큰 파일은 필요한 부분만 읽는다.
- 코드 구조를 파악할 때는 graphify 그래프를 먼저 쓰고, 파일 전체를 반복해서 읽지 않는다. 그래프는 코드 이름(영어)으로 되어 있으니 `graphify query "refund payment toss"` 처럼 영어 낱말로 묻는다.
- 반복되는 작업이나 사용자가 고쳐 준 점은 `docs/agents/handoff.md` 의 "배운 점"에 한 줄씩 적는다(이 클라우드는 대화가 끝나면 기록이 사라진다).
