# 냥신 점괘 운영 가이드

로그인·결제를 실제로 켜는 순서와 오픈 전 점검 목록입니다. 키를 넣는 곳은 모두 **Vercel → 프로젝트(chemickok) → Settings → Environment Variables**이고, 넣은 뒤에는 **Deployments → 맨 위 배포 → ⋯ → Redeploy**를 해야 반영됩니다.

---

## 1. 로그인

코드는 카카오·네이버·구글·이메일 네 가지가 모두 들어가 있습니다. 키가 들어간 것만 로그인 화면에 버튼이 나타납니다.

| 방식 | 지금 상태 | 할 일 |
| --- | --- | --- |
| 카카오 | 켜져 있음 | 없음 |
| 이메일 | 이번 배포로 바로 켜짐 | (선택) 비밀번호 재설정 메일 설정 — 1-4 |
| 네이버 | 키 없음 | 1-2 |
| 구글 | 키 없음 | 1-3 |

### 1-1. 공통으로 쓰는 주소

- 서비스 주소: `https://chemickok.vercel.app`
- 네이버 Callback URL: `https://chemickok.vercel.app/api/auth/naver/callback`
- 구글 리디렉션 URI: `https://chemickok.vercel.app/api/auth/google/callback`

나중에 도메인을 사면 주소를 새 도메인으로 바꿔서 같은 자리에 추가로 등록합니다.

### 1-2. 네이버 로그인

1. https://developers.naver.com 에 로그인 → **Application → 애플리케이션 등록**
2. 애플리케이션 이름: `냥신 점괘` · 사용 API: **네이버 로그인**
3. 제공 정보: **별명**(필수), **이메일**(선택)
4. 로그인 오픈 API 서비스 환경: **PC 웹**, **Mobile 웹** 둘 다 추가하고, 서비스 URL과 Callback URL을 위 1-1 주소로 입력합니다.
5. 등록하면 나오는 **Client ID / Client Secret**을 Vercel에 넣습니다.
   - `NAVER_CLIENT_ID` = Client ID
   - `NAVER_CLIENT_SECRET` = Client Secret
6. 처음에는 "개발 중" 상태라 **멤버 관리에 등록한 네이버 아이디만** 로그인됩니다. 모든 사람이 쓰려면 **검수 요청**을 해야 합니다. 로그인 버튼 화면 캡처와 개인정보처리방침이 필요하며, 처리까지 며칠 걸립니다. 개인정보처리방침은 사이트 맨 아래 링크를 쓰면 됩니다.

### 1-3. 구글 로그인

1. https://console.cloud.google.com → 새 프로젝트 만들기 (이름: `nyangsin`)
2. **API 및 서비스 → OAuth 동의 화면**(또는 "Google 인증 플랫폼")
   - 사용자 유형: **외부**
   - 앱 이름 `냥신 점괘`, 지원 이메일 `chemickok@gmail.com`
   - 범위(scope)는 기본인 `openid`, `email`, `profile`만 씁니다. 민감한 범위가 아니어서 별도 심사 없이 게시할 수 있습니다.
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 승인된 리디렉션 URI: 1-1의 구글 주소
4. 나오는 값을 Vercel에 넣습니다.
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
5. 동의 화면을 **"테스트"에서 "프로덕션으로 게시"** 로 바꿔야 누구나 로그인할 수 있습니다. 테스트 상태에서는 등록한 테스트 사용자만 됩니다.
6. 구글은 카카오톡·인스타그램 안의 브라우저에서 로그인을 막습니다. 그래서 그 안에서는 구글 버튼을 숨기고 "다른 브라우저로 열기"를 안내하도록 해 두었습니다.

### 1-4. 이메일 회원가입 (비밀번호 재설정 메일)

- 가입과 로그인은 따로 설정할 것이 없습니다. 비밀번호는 복원할 수 없는 방식(scrypt)으로 저장됩니다.
- **비밀번호 찾기**를 쓰려면 메일 발송 계정이 필요합니다. 설정하지 않으면 "고객문의로 알려 달라"는 안내가 나갑니다. Gmail로 설정하는 방법:
  1. chemickok@gmail.com 구글 계정 → **보안 → 2단계 인증 켜기**
  2. **보안 → 앱 비밀번호** → 이름 `nyangsin` → 16자리 비밀번호 생성
  3. Vercel에 넣기: `SMTP_USER` = `chemickok@gmail.com`, `SMTP_PASS` = 16자리(공백 없이)
  4. Gmail은 하루 약 500통까지 보낼 수 있습니다.
- 가입 선물 냥은 **카카오·네이버·구글 가입에만** 지급됩니다. 이메일은 무제한으로 만들 수 있어 선물을 받으면 악용될 수 있기 때문입니다.

---

## 2. 결제 (토스페이 · 카카오페이)

### 2-1. 구조

- 결제창은 **토스페이먼츠** 하나로 연결되어 있습니다. 결제 화면에는 세 버튼이 있습니다.
  - **토스페이** → 토스 앱이 바로 열립니다.
  - **카카오페이** → 카카오페이가 바로 열립니다.
  - **카드·기타** → 토스 통합 결제창이 열리고, 카드사와 다른 간편결제를 고를 수 있습니다.
- 그래서 카카오페이와 따로 계약할 필요 없이, **토스페이먼츠 계약 하나 + 간편결제 추가 신청**으로 끝납니다.

### 2-2. 계약 순서

1. https://www.tosspayments.com → **전자결제 신청**
   - 필요한 것: 사업자등록증(넥스트원), 통신판매업 신고번호(이미 있음), 대표자 정보, 정산 계좌
   - 판매 상품: "디지털 콘텐츠(운세·심리 콘텐츠)"로 설명합니다. 운세·점술 업종은 카드사 심사에서 추가 확인을 요청할 수 있으니, 사이트 주소, 이용약관, 환불 규정을 미리 보여 줄 수 있게 준비해 두세요. 사이트 하단에 이미 있습니다.
2. 심사가 끝나면 **상점관리자 → 결제수단** 에서 **토스페이**와 **카카오페이**(필요하면 네이버페이도) 추가를 신청합니다. 간편결제사별로 심사가 따로 있으며 보통 수일에서 2주 걸립니다.
3. **개발자센터 → API 키** 에서 **"API 개별 연동 키"**를 확인합니다. "결제위젯 연동 키"가 아닙니다. 이 서비스는 결제창 방식(SDK v2 `payment()`)이라 개별 연동 키를 써야 합니다.

### 2-3. 키 넣기 — 먼저 테스트 키로

| 변수 | 테스트 단계 | 오픈 |
| --- | --- | --- |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | `test_ck_…` | `live_ck_…` |
| `TOSS_SECRET_KEY` | `test_sk_…` | `live_sk_…` |
| `NEXT_PUBLIC_PAYMENT_TEST_MODE` | `false` | `false` |
| `PAYMENT_TEST_MODE` | `false` | `false` |

- 두 TEST_MODE 값을 `false`로 바꾸는 순간부터 진짜 토스 결제창이 열립니다. 테스트 키를 쓰는 동안은 실제로 돈이 나가지 않습니다.
- 테스트 키로 다음을 직접 해 봅니다.
  - 비회원 바로 결제(토스페이 / 카카오페이 / 카드)
  - 냥 충전
  - 결제 완료 화면 새로고침 — 다시 눌러도 "실패"가 뜨지 않게 고쳐 두었습니다.
- 모두 확인되면 라이브 키로 바꾸고 Redeploy합니다.

### 2-4. 오픈 전에 꼭

1. **테스트 모드로 쌓인 냥 정리**
   - 지금은 테스트 모드라 누구나 공짜로 냥을 충전할 수 있습니다.
   - 오픈 직전에 Supabase → SQL Editor에서 아래를 실행하세요. 테스트 충전 기록을 지우고 잔액을 다시 계산합니다.

   ```sql
   delete from coin_ledger where reason = 'charge' and ref like 'test-%';
   update wallets w
     set balance = greatest(0, coalesce((select sum(delta) from coin_ledger l where l.user_id = w.user_id), 0)),
         updated_at = now();
   delete from payments where order_id like 'test-%';
   delete from users where provider = 'dev';  -- 개발용 테스트 계정
   ```

2. **카카오 개발자 콘솔 → 앱 → 플랫폼 → Web** 에 `https://chemickok.vercel.app`이 등록돼 있는지 확인합니다. 등록이 안 돼 있으면 카톡 공유 창이 안 뜨고 링크 복사로 바뀝니다.

---

## 3. 냥 운영

- **가격·상품 바꾸기**
  - 파일: `src/lib/config.ts`
  - `COIN_PACKS`: 충전 상품
  - 각 상품의 `coins`: 점괘별 냥
  - `WELCOME_COINS`: 가입 선물
  - `INVITE_COINS` / `INVITE_LIMIT`: 친구 초대 선물과 1인당 최대 인원
- **환불 요청이 오면**
  - 토스페이먼츠 상점관리자에서 해당 주문을 취소합니다. 주문번호는 고객의 충전 내역 시각으로 찾습니다.
  - 그다음 Supabase SQL Editor에서 냥을 빼 줍니다.

  ```sql
  -- 고객 찾기 (이메일 또는 닉네임)
  select id, provider, nickname, email from users where email = '고객@이메일' or nickname = '닉네임';
  -- 남은 냥 확인
  select * from coin_ledger where user_id = '고객 id' order by id desc;
  -- 냥 빼기 (예: 5냥 환불) — 직접 기록을 남기고 잔액을 줄입니다
  insert into coin_ledger (user_id, delta, reason, ref, balance_after)
    select '고객 id', -5, 'refund', '환불 주문번호', balance - 5 from wallets where user_id = '고객 id';
  update wallets set balance = balance - 5, updated_at = now() where user_id = '고객 id';
  ```

- **보상으로 냥 넣어 주기**: `select coin_add('고객 id', 1, 'admin', '보상-날짜-사유');` — 같은 사유 문자열은 한 번만 들어갑니다.
- **환불 규정**: 이용약관 제4·5조에 넣어 두었습니다.
  - 7일 안에 쓰지 않은 충전분은 전액 환불
  - 그 이후 남은 유료 냥은 10% 이내 수수료를 빼고 환불
  - 무료 냥은 환불 불가이고, 먼저 쓴 것으로 봄
  - 실제 운영 전에 세무사·법무 검토를 한 번 받는 것을 권합니다.
