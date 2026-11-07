/**
 * 관리자 할 일: the chores that keep the shop healthy, each with how often it comes back. When each was last done lives
 * in app_settings ("admin_todo"), so the phone app and the computer see the same list.
 */
export interface TodoDef {
  id: string;
  label: string;
  /** comes back after this many days */
  every: number;
  how: string;
  /** a 관리자 tab that does it */
  tab?: "pay" | "flow" | "errors" | "promo" | "prices";
  /** or a download (the backup) */
  href?: string;
  /** or a page elsewhere (the mail inbox) */
  link?: string;
  /** marked done by itself when the thing happens (the backup download) */
  auto?: boolean;
}

export const ADMIN_TODOS: TodoDef[] = [
  { id: "inbox", label: "📨 고객 문의 메일 확인", every: 1, how: "고객문의 메일함을 연다. 환불 요청은 받은 날부터 3영업일 안에 처리한다(결제·환불 탭).", link: "https://mail.google.com" },
  { id: "errors", label: "🚨 오류 확인", every: 1, how: "오류 탭에 숫자가 있거나 새 오류 메일이 왔으면 내용을 보고, 모르겠으면 Claude에게 캡처를 보낸다.", tab: "errors" },
  { id: "backup", label: "💾 전체 백업 받기", every: 7, how: "백업 파일을 내려받아 개인 클라우드에 보관한다. 받으면 저절로 완료된다.", href: "/api/admin/backup", auto: true },
  { id: "settle", label: "💳 토스 정산 대조", every: 7, how: "토스 상점관리자의 정산 금액과 결제·환불 탭의 순매출이 맞는지 본다.", tab: "pay" },
  { id: "flow", label: "📈 이용 흐름 보기", every: 7, how: "질문별로 손님이 많이 나가는 곳을 찾는다. 고칠 곳은 Claude에게 알려 준다.", tab: "flow" },
  { id: "promo", label: "📢 공지·세일·쿠폰 점검", every: 14, how: "끝난 공지와 세일을 내리고, 다음 시즌(수능·크리스마스·신년·설날) 이벤트를 준비한다.", tab: "promo" },
  { id: "export", label: "🧾 지난달 결제·환불 엑셀 받기", every: 30, how: "결제·환불 탭 아래 ‘엑셀로 내려받기’로 지난달 내역을 받아 장부·세무용으로 보관한다.", tab: "pay" },
  { id: "key", label: "🔑 관리자 키 바꾸기", every: 90, how: "Vercel → chemickok → Settings → Environment Variables에서 ADMIN_KEY를 새 값(20자 이상)으로 바꾸고 Redeploy." },
];

export type TodoDone = Record<string, string>;

/** Days until it comes back (0 or less = do it now); null when never done. */
export function daysLeft(def: TodoDef, last: string | undefined, now = Date.now()): number | null {
  if (!last) return null;
  const done = Date.parse(last);
  if (!Number.isFinite(done)) return null;
  // counted in KST days, so "매일" comes back the next morning, not 24 hours later
  const day = (t: number) => Math.floor((t + 9 * 36e5) / 864e5);
  return def.every - (day(now) - day(done));
}

export const isDue = (def: TodoDef, last: string | undefined, now = Date.now()) => {
  const d = daysLeft(def, last, now);
  return d === null || d <= 0;
};
