"use client";

import { useState } from "react";
import { BUSINESS } from "@/lib/config";
import { LegalModal, type LegalDoc } from "./LegalModal";

export function Footer() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  return (
    <footer className="mt-auto border-t border-line px-5 pb-10 pt-6 text-[11px] leading-relaxed text-muted/80">
      <div className="mb-3 flex gap-3 text-xs font-medium text-muted">
        <button onClick={() => setDoc("terms")} className="underline-offset-2 hover:underline">
          이용약관
        </button>
        <span aria-hidden>|</span>
        <button onClick={() => setDoc("privacy")} className="font-bold underline-offset-2 hover:underline">
          개인정보처리방침
        </button>
      </div>
      <p>
        상호: {BUSINESS.company} | 대표: {BUSINESS.rep} | 사업자등록번호: {BUSINESS.bizId}
      </p>
      <p>통신판매업신고: {BUSINESS.ecommerceNo}</p>
      <p>주소: {BUSINESS.address}</p>
      <p className="mt-3 rounded-lg bg-white/[0.03] p-3">
        본 서비스는 결제 즉시 리포트가 제공되는 디지털 콘텐츠 상품으로, 리포트 열람 이후에는 전자상거래법에 따라
        청약철회가 제한될 수 있습니다.
      </p>
      <p className="mt-3">ⓒ {BUSINESS.company}. 본 콘텐츠는 엔터테인먼트 목적으로 제공됩니다.</p>
      <LegalModal doc={doc} onClose={() => setDoc(null)} />
    </footer>
  );
}
