/**
 * Bottom of the landing: how 냥신 reads a chart, step by step in the trade's own order, and what it promises.
 * Every claim here matches what the engine and server actually do (절입 월주, 십성 · 용신 · 신살 · 대운/세운/월운, 근거표,
 * no birthdate kept without login), so nothing on this page is made up.
 */
const STEPS: { no: string; hanja: string; title: string; body: string }[] = [
  {
    no: "一",
    hanja: "立命",
    title: "만세력으로 원국 세우기",
    body: "생년월일시를 만세력에 대입해 년·월·일·시 네 기둥, 여덟 글자를 세운다냥. 월주는 달력 1일이 아니라 절기(節入)가 바뀌는 날을 기준으로 잡는다냥.",
  },
  {
    no: "二",
    hanja: "十星",
    title: "오행과 십성 읽기",
    body: "여덟 글자의 목·화·토·금·수 비율을 세고, 일간(나)을 기준으로 열 가지 관계(십성)를 짚는다냥. 타고난 기질과 빈자리가 여기서 나온다냥.",
  },
  {
    no: "三",
    hanja: "用神",
    title: "신강·신약과 용신",
    body: "내 기운이 센지 약한지 따져 나를 살리는 기운(용신)을 정한다냥. 좋은 해·좋은 달·행운의 색과 방향은 전부 이 한 글자에서 나온다냥.",
  },
  {
    no: "四",
    hanja: "神殺",
    title: "숨은 별, 신살",
    body: "도화·역마·화개·홍염·천을귀인처럼 원국에 숨은 별을 찾아 연애와 인연, 이동 운에 얹는다냥.",
  },
  {
    no: "五",
    hanja: "運",
    title: "대운 · 세운 · 월운",
    body: "10년 운, 그해 운, 그달 운을 원국과 맞대 점수로 낸다냥. 그래서 '언젠가'가 아니라 몇 년, 몇 월로 말한다냥.",
  },
  {
    no: "六",
    hanja: "問",
    title: "면담으로 맞추기",
    body: "같은 사주라도 사는 모습은 다르다냥. 면담에서 들은 네 답으로 지금 네 상황에 맞는 해석을 골라 쓴다냥.",
  },
  {
    no: "七",
    hanja: "證",
    title: "근거까지 공개",
    body: "감정서마다 원국·십성·용신·신살·대운을 적은 근거표를 붙인다냥. 왜 그렇게 봤는지 숨기지 않는다냥.",
  },
];

const PROMISES: [string, string, string][] = [
  ["🔒", "생년월일은 점괘에만", "로그인하지 않으면 생년월일을 서버에 남기지 않는다냥. 로그인하면 내 점괘함에만 보관한다냥."],
  ["🪙", "보고 나서 정하는 복채", "기본 점괘는 무료다냥. 더 듣고 싶을 때만 복채를 낸다냥."],
  ["🕯️", "결정은 네가", "점괘는 마음을 정리하는 거울이다냥. 중요한 결정은 네 손으로 내려라냥."],
];

export function MethodSection() {
  return (
    <section className="fade-up mb-12 mt-12" style={{ animationDelay: "0.35s" }} aria-labelledby="method-title">
      <p className="text-center text-[12px] tracking-[0.45em] text-violet">鑑 定 法</p>
      <h2 id="method-title" className="font-ritual mt-1 text-center text-[22px]">
        냥신 점집은 이렇게 본다냥
      </h2>
      <p className="mt-2 text-center text-[13.5px] leading-relaxed text-muted">
        감으로 찍지 않는다냥. 명리학이 쓰는 순서 그대로,
        <br />
        일곱 단계를 거쳐 감정서를 쓴다냥.
      </p>

      <ol className="relative mt-6 space-y-5 pl-1">
        <span className="absolute bottom-3 left-[22px] top-3 w-px bg-gradient-to-b from-violet/60 via-violet/25 to-transparent" aria-hidden />
        {STEPS.map((s) => (
          <li key={s.no} className="relative flex gap-4">
            <span className="font-ritual relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-violet/50 bg-[#1a0d0a] text-[17px] text-peach">
              {s.no}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[15.5px] font-bold">
                {s.title}
                <span className="ml-2 font-serif text-[12px] font-normal tracking-[0.15em] text-violet">{s.hanja}</span>
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Dark lacquer with a brass edge and a red seal, so it sits in the night instead of glowing like paper. */}
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-violet/40 bg-gradient-to-b from-[#24130d] to-[#120a07] px-5 py-4 shadow-[inset_0_1px_0_rgba(240,207,138,0.12)]">
        <p className="text-[12px] tracking-[0.35em] text-violet">約 束</p>
        <p className="font-ritual text-[17px] text-peach">냥신의 약속</p>
        <span className="seal absolute right-4 top-4 opacity-80" aria-hidden>
          猫神
          <br />
          之印
        </span>
        <ul className="mt-2 divide-y divide-violet/20">
          {PROMISES.map(([icon, title, body]) => (
            <li key={title} className="flex gap-3 py-2.5">
              <span className="text-[18px]" aria-hidden>
                {icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-ink">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
