import Link from "next/link";
import { Nyang } from "./Nyang";

/** Frame for the 일주 · 띠 pages: the shop sign up top, a way into a reading at the bottom. */
export function SeoShell({ children, cta }: { children: React.ReactNode; cta: { href: string; label: string; sub: string } }) {
  return (
    <main className="flex-1 px-5 pb-12 pt-5">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-peach">
        <Nyang mood="smug" size={30} /> 냥신 점괘
      </Link>
      <div className="mt-6">{children}</div>
      <Link href={cta.href} className="btn-primary mt-10 block w-full py-4 text-center text-[16px]">
        {cta.label}
      </Link>
      <p className="mt-2 text-center text-[12.5px] text-muted">{cta.sub}</p>
      <Link href="/" className="mt-6 block text-center text-[13px] text-muted underline underline-offset-4">
        냥신 점집 처음으로
      </Link>
    </main>
  );
}
