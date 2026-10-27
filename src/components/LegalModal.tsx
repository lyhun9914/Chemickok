"use client";

import { useEffect } from "react";
import { BUSINESS } from "@/lib/config";

export type LegalDoc = "terms" | "privacy";

const DOCS: Record<LegalDoc, { title: string; sections: [string, string][] }> = {
  terms: {
    title: "이용약관",
    sections: [
      ["제1조 (목적)", `본 약관은 ${BUSINESS.company}(이하 "회사")가 제공하는 연애 케미 & 속마음 리포트 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무를 규정함을 목적으로 합니다.`],
      ["제2조 (서비스의 성격)", "서비스는 이용자가 입력한 생년월일과 설문 응답을 정해진 해석 규칙에 따라 조합해 제공하는 엔터테인먼트 목적의 사주·연애 심리 콘텐츠입니다. 결과는 과학적·의학적·법률적 판단이나 전문 상담을 대체하지 않습니다."],
      ["제3조 (유료 콘텐츠)", "상세 리포트는 건당 990원(부가세 포함)의 디지털 콘텐츠로 제공되며, 결제 완료 즉시 생성·열람이 가능합니다."],
      ["제4조 (청약철회)", "본 서비스는 결제 즉시 리포트가 제공되는 디지털 콘텐츠 상품으로, 리포트 열람 이후에는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따라 청약철회가 제한될 수 있습니다. 다만 결제 후 리포트가 정상 제공되지 않은 경우 전액 환불합니다."],
      ["제5조 (회원)", "이용자는 카카오·네이버·구글 계정으로 로그인해 회원이 될 수 있으며, 회원은 기본 정보를 저장하고 결제한 점괘를 내 점괘함에서 다시 볼 수 있습니다. 회원은 언제든지 내 점괘함에서 탈퇴할 수 있습니다. 로그인 없이도 서비스를 이용하고 결제할 수 있습니다."],
      ["제6조 (이용자의 의무)", "이용자는 타인의 개인정보를 무단으로 입력하거나, 서비스 결과를 타인을 비방·괴롭히는 용도로 사용해서는 안 됩니다."],
      ["제7조 (면책)", "회사는 콘텐츠의 정확성을 보증하지 않으며, 이용자가 결과를 근거로 내린 결정에 대해 책임지지 않습니다."],
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    sections: [
      [
        "1. 처리 항목",
        "[비회원] 이름(닉네임), 성별, 생년월일, 출생 시간(선택), MBTI(선택), 관계 상태, 면담 응답. [회원] 위 항목에 더해 소셜 로그인 식별값(카카오·네이버·구글 회원번호), 닉네임, 이메일(제공 동의 시), 저장한 기본 정보(이름·성별·생년월일·출생 시간·MBTI), 결제한 점괘 결과. 결제 정보는 결제대행사가 처리하며 회사는 카드번호를 저장하지 않습니다.",
      ],
      ["2. 이용 목적", "점괘 산출, 회원 식별 및 로그인, 기본 정보 자동 입력, 결제한 점괘의 보관·재열람(내 점괘함), 결제 확인 및 고객 문의 대응."],
      [
        "3. 보유 기간",
        "[비회원] 입력 정보는 점괘 산출에만 사용되고 서버에 저장하지 않으며, 브라우저 창을 닫으면 삭제됩니다. [회원] 회원 정보와 내 점괘함의 점괘는 회원 탈퇴 시 즉시 삭제됩니다. 이용자는 점괘를 하나씩 직접 삭제할 수도 있습니다. 점괘함에는 상대방의 이름만 결과와 함께 보관되며, 상대방의 생년월일 등 다른 정보는 저장하지 않습니다. 전자상거래법에 따른 대금결제 기록(주문번호·금액·일시)은 5년간 보관하며, 탈퇴 시 회원과의 연결은 삭제됩니다.",
      ],
      ["4. 처리위탁 및 보관 장소", "결제: 토스페이먼츠·카카오페이. 회원 정보 저장: Supabase(데이터베이스, 서울 리전). 서비스 호스팅: Vercel Inc. 소셜 로그인: 카카오·네이버·구글(이용자가 선택한 서비스에 한함)."],
      ["5. 이용자의 권리", "이용자는 내 점괘함에서 기본 정보를 열람·수정하고 점괘를 삭제할 수 있으며, 회원 탈퇴로 모든 정보를 삭제할 수 있습니다. 그 밖의 열람·정정·삭제 요청은 아래 연락처로 할 수 있습니다."],
      ["6. 개인정보 보호책임자", `${BUSINESS.rep} (${BUSINESS.company}) · 전화 ${BUSINESS.phone} · 이메일 ${BUSINESS.email}`],
    ],
  },
};

export function LegalModal({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  if (!doc) return null;
  const d = DOCS[doc];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={d.title}
        className="fade-up max-h-[80dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{d.title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-muted hover:bg-white/5" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-muted">
          {d.sections.map(([h, b]) => (
            <section key={h}>
              <h3 className="mb-1 font-semibold text-ink">{h}</h3>
              <p>{b}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
