"use client";

import { useState } from "react";
import { BUSINESS } from "@/lib/config";
import { LegalModal, type LegalDoc } from "./LegalModal";

export function Footer() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  return (
    <footer className="mt-auto border-t border-line px-5 pb-10 pt-6 text-[12px] leading-relaxed text-muted/80">
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-muted">
        <button onClick={() => setDoc("terms")} className="underline-offset-2 hover:underline">
          이용약관
        </button>
        <span aria-hidden>|</span>
        <button onClick={() => setDoc("privacy")} className="font-bold underline-offset-2 hover:underline">
          개인정보처리방침
        </button>
        <span aria-hidden>|</span>
        <a href={`mailto:${BUSINESS.email}`} className="underline-offset-2 hover:underline">
          고객문의
        </a>
      </div>

      {/* 전자상거래법 제10조 표시사항 — collapsed by default to keep the page clean */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted [&::-webkit-details-marker]:hidden">
          {BUSINESS.company} 사업자 정보
          <span className="transition group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="mt-2 space-y-0.5">
          <p>
            상호: {BUSINESS.company} | 대표: {BUSINESS.rep}
          </p>
          <p>사업자등록번호: {BUSINESS.bizId}</p>
          <p>통신판매업신고: {BUSINESS.ecommerceNo}</p>
          <p>주소: {BUSINESS.address}</p>
          <p>
            전화: <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phone}</a> | 이메일:{" "}
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
          </p>
          <p>호스팅 제공자: {BUSINESS.hosting}</p>
        </div>
      </details>

      <p className="mt-3">
        디지털 콘텐츠 특성상 리포트 열람 이후에는 전자상거래법에 따라 청약철회가 제한될 수 있습니다.
      </p>
      <p className="mt-1">ⓒ {BUSINESS.company}. 본 콘텐츠는 엔터테인먼트 목적으로 제공됩니다.</p>
      <LegalModal doc={doc} onClose={() => setDoc(null)} />
    </footer>
  );
}
