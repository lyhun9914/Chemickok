# 총책임자 인수인계 (2026-11-13)

새 총책임자 대화는 이 문서 → `AGENTS.md` → `docs/agents/autopilot.md`(1-1, 4, 9번) 순서로 읽고 이어서 한다. 운영자에게는 한국어로, 쉽게, 짧게.

## 지금 상태
- 실제 사이트 main = 홈 개편 B안(탭·시즌 주인공·`?open=` 바로가기) + 홈 문구 A안. 손님 보기 점검 통과(11/13).
- 결제: 토스 카드사 심사 중(신한·롯데 승인, 나머지 심사 중, 12/1 전후 예상). 실제 사이트 환경변수는 테스트 모드 false + **토스 테스트 키** → 손님이 충전하면 공짜 냥이 들어가는 구멍이 있음.
- 운영실 대화는 11/13 보관. 담당 에이전트(`.claude/agents/nyang-*`)를 총책임자가 직접 부른다. 동시에는 2개까지.

## 진행 중인 일 (dev 에 있음, main 배포 전)
1. **충전 "준비 중" 차단** `e0fefaf`: 실제 사이트에서 토스 키가 `test_` 이면 충전·단건 결제 버튼 자리에 "🐾 결제 오픈 준비 중이다냥" 안내, 서버도 403. `live_` 키로 바꾸면 자동으로 열림(⚠️ 클라이언트·시크릿 키 둘 다 같이 바꿀 것). 점검 담당 회귀 점검 중이었음(결과는 이전 대화에서 이어 보냄).
2. **수능 부적 홍보** `f56eb26`: `public/promo/reel-bujeok-suneung.mp4`(D-3), `story-bujeok-suneung-d1.mp4`(D-1) 새로 만듦, `docs/marketing/instagram-plan.md` 에 "11/13 예외: 수능 무료 부적만 먼저" 반영. 캡션은 계획표 참고. **인스타에는 아직 아무것도 안 올림.**

## 운영자 결정 대기
1. 1·2를 실제 사이트에 올릴지 (결제 코드라 운영자 승인 필요). 배포는 dev→main PR 을 만들어 운영자가 머지(이 환경은 main 직접 push 가 막힘). **PR 만들기 전에 `gh api repos/lyhun9914/nyangsin/compare/main...dev` 로 들어갈 커밋을 확인하고 운영자에게 알릴 것** (11/13 의도치 않은 커밋이 같이 배포된 적 있음).
2. 수능 캡션·영상 승인, 게시 방식: ① 별도 예약(릴스 11/16 19:30, 스토리 11/18 18:30, 추천) ② 9시 7분 순회. 게시는 영상이 main 에 배포된 뒤 `https://nyangsin.vercel.app/promo/...` 200 확인 후 Windsor `create_video_post`/`create_story`.
3. 실제 사이트 "오픈 기념 5냥 충전 +1냥(~11/30)" 배너를 관리자 화면에서 끄기(운영자 작업, 안내함).
4. 인스타 프로필 링크 → `https://nyangsin.vercel.app/?open=bujeok` (운영자 작업, 안내함).

## 다음 할 일 (운영자가 고른 순서)
- ② 결제 오픈 당일 준비: 순서표는 `docs/GUIDE.md` 2-4 (11/13 정리, 테스트 키 결제 5건 현황 포함). 남은 것: 오픈 이벤트 기간, 홍보 D+0 은 운영자 결정.
- ③ 신년운세 시즌 점검(12/1 시즌 카드 자동): 테스트 사이트에서 신년운세 결제~감정서, 로그인 회원, 관리자 "홈 첫 화면 주인공".
- 인스타 공격적 홍보는 결제 오픈 뒤(운영자 결정). 수능 부적만 예외.

## 예약 작업 (11/13 새 총책임자 대화 `session_01TLH2dxnfHDqPeNp2Eu5L2r` 로 옮김, 옛 대화 것은 끔)
- 매일 순회 `CRON_TZ=Asia/Seoul 7 9 * * *`
- 11/17 10:00 토스 예전 MID 환불 입금 확인 · 11/21 10:00 케미콕 구글 계정 삭제 재시도 · 11/25 10:00 카드사 심사 확인 · 12/1 09:10 오픈 기념 배너 점검
- 다음에 대화를 옮길 때는 `list_triggers` 에서 옛 대화 번호에 묶인 것을 **전부** 다시 만들고 끈다(11/13 에 3개가 빠질 뻔함).

## 토큰 아끼기 (11/13 운영자 지적)
- 대화가 길어지면 매 턴 전체를 다시 읽어 비싸다. 1~2주마다 이 문서를 고쳐 쓰고 새 대화로 옮긴다.
- 담당에게는 범위를 좁게, 스크린샷은 필요한 것만, 동시에 2개까지.
- 코드 위치는 `graphify query "<영어>"` 먼저(그래프가 없으면 `graphify update .`).

## 링크
- 실제 https://nyangsin.vercel.app · 관리자 https://nyangsin-admin.vercel.app
- 테스트 https://nyangsin-test.vercel.app · 테스트 관리자 https://nyangsin-test-admin.vercel.app
- 저장소 https://github.com/lyhun9914/nyangsin · 인스타 nyangsin_official
- Vercel 프로젝트 `chemickok` (prj_s8oPSZIRgNhH5KZzie1uo7VhrWeV, team_zTsoC4DzGz6SUhfWgriyCpGA) · 운영 Supabase `lykbrnfxydmsoxrcdabk`
