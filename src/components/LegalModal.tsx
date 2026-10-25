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
      ["제5조 (이용자의 의무)", "이용자는 타인의 개인정보를 무단으로 입력하거나, 서비스 결과를 타인을 비방·괴롭히는 용도로 사용해서는 안 됩니다."],
      ["제6조 (면책)", "회사는 콘텐츠의 정확성을 보증하지 않으며, 이용자가 결과를 근거로 내린 결정에 대해 책임지지 않습니다."],
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    sections: [
      ["1. 처리 항목", "이름(닉네임), 성별, 생년월일, 출생 시간(선택), 관계 상태 및 설문 응답. 결제 정보는 결제대행사가 처리하며 회사는 카드번호를 저장하지 않습니다."],
      ["2. 이용 목적", "리포트 산출 및 결제 확인."],
      ["3. 보유 기간", "입력 정보는 리포트 산출에만 일시적으로 사용되며 서버에 저장하지 않습니다. 입력 내용과 결과는 이용자의 브라우저(세션)에만 남고 창을 닫으면 삭제됩니다. 전자상거래법에 따른 거래 기록은 결제대행사를 통해 5년간 보관됩니다."],
      ["4. 처리위탁", "결제 처리를 위해 토스페이먼츠·카카오페이에 위탁합니다."],
      ["5. 이용자의 권리", "이용자는 언제든지 개인정보 열람·정정·삭제를 요청할 수 있습니다."],
      ["6. 개인정보 보호책임자", `${BUSINESS.rep} (${BUSINESS.company})`],
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
