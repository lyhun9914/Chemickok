import Link from "next/link";
import { LEGAL_DOCS, type LegalDoc } from "@/lib/legal";
import { Nyang } from "./Nyang";

/** /terms · /privacy: the same text as the footer sheet, at its own address (for reviews and links). */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  const d = LEGAL_DOCS[doc];
  const other: LegalDoc = doc === "terms" ? "privacy" : "terms";
  return (
    <main className="flex-1 px-5 pb-12 pt-5">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-peach">
        <Nyang mood="smug" size={30} /> 냥신 점괘
      </Link>
      <h1 className="mt-6 text-[24px] font-bold">{d.title}</h1>
      <div className="mt-5 space-y-5 text-[14px] leading-relaxed text-muted">
        {d.sections.map(([h, b]) => (
          <section key={h}>
            <h2 className="mb-1 text-[15px] font-semibold text-ink">{h}</h2>
            <p>{b}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 flex justify-center gap-4 text-[13px] text-muted">
        <Link href={`/${other}`} className="underline underline-offset-4">
          {LEGAL_DOCS[other].title}
        </Link>
        <Link href="/" className="underline underline-offset-4">
          냥신 점집 처음으로
        </Link>
      </div>
    </main>
  );
}
