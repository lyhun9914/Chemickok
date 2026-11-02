"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Assets,
  type Comp,
  type ShortsData,
  H,
  W,
  download,
  loadFonts,
  png,
  record,
  svgImage,
  ttiCard,
  ttiList,
  ttiVideo,
  typeCard,
  typeVideo,
  videoFormat,
} from "@/lib/shorts";
import { Nyang } from "../Nyang";

const SCALE = 0.25;

/** A small live preview of a composition's last frame. */
function Thumb({ comp }: { comp: Comp }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    comp.draw(ctx, comp.duration || Infinity);
  }, [comp]);
  return <canvas ref={ref} width={W * SCALE} height={H * SCALE} className="w-full rounded-lg border border-line" />;
}

/** yyyy-mm-dd in KST, `plus` days from today. */
const kstDay = (plus = 0) => new Date(Date.now() + 9 * 3600e3 + plus * 864e5).toISOString().slice(0, 10);
/** File names stay ASCII: some browsers drop a download name with Korean in it. */
const ANIMAL_EN = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
/** Words the frames draw besides the data, so their glyphs load before the first preview. */
const FRAME_TEXT = "냥신점괘오늘의띠별운세순위공개1등은마지막에내띠가몇위인지끝까지보라냥연애팔자16유형할때이러면이유형이다찰떡상극너는뭐3분면담무료프로필링크사주로보는년생중위점말고";

/**
 * 쇼츠 · 릴스 소재: today's (or tomorrow's) 띠별 운세 and the 16유형 cards, drawn here as 9:16 PNG and MP4, with a
 * caption to paste. Nothing is stored: the day's numbers come from the same engine as the site.
 */
export function ShortsStudio() {
  const [day, setDay] = useState(kstDay());
  const [tab, setTab] = useState<"tti" | "type">("tti");
  const [data, setData] = useState<ShortsData | null>(null);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const cats = useRef<HTMLDivElement>(null);
  const [video, setVideo] = useState<"mp4" | "webm" | null>(null);

  // the cat is drawn from the site's own SVG, once; and what kind of video this browser can make
  useEffect(() => {
    videoFormat().then(setVideo);
    const svgs = cats.current?.querySelectorAll("svg");
    if (!svgs || svgs.length < 2) return;
    Promise.all([svgImage(svgs[0]), svgImage(svgs[1])])
      .then(([cat, catHappy]) => setAssets({ cat, catHappy }))
      .catch(() => setNote("고양이 그림을 불러오지 못했어요."));
  }, []);

  useEffect(() => {
    let live = true;
    setData(null);
    (async () => {
      const r = await fetch(`/api/admin/shorts?day=${day}`, { cache: "no-store" });
      const d = (await r.json()) as ShortsData & { error?: string };
      if (!r.ok) throw new Error(d.error ?? "소재를 불러오지 못했어요");
      // the frames use the site's web fonts, which load by character: fetch the ones these frames need first
      await loadFonts(JSON.stringify(d) + FRAME_TEXT);
      if (live) setData(d);
    })().catch((e: Error) => live && setNote(e.message));
    return () => {
      live = false;
    };
  }, [day]);

  // built once per day's data, so the previews don't redraw while a video records
  const comps = useMemo(() => {
    if (!data || !assets) return null;
    return {
      list: ttiList(data, assets),
      video: ttiVideo(data, assets),
      cards: data.tti.map((r, i) => ({
        r,
        comp: ttiCard(data, r, assets),
        name: `nyang-tti-${data.day}-${String(i + 1).padStart(2, "0")}-${ANIMAL_EN[i]}`,
      })),
      types: data.types.map((ty) => ({
        ty,
        card: typeCard(ty, assets),
        video: typeVideo(ty, assets),
        name: `nyang-type-${String(ty.no).padStart(2, "0")}-${ty.code}`,
      })),
    };
  }, [data, assets]);

  const saveImage = async (comp: Comp, name: string) => download(await png(comp), `${name}.png`);

  const saveAll = async (items: { comp: Comp; name: string }[]) => {
    setBusy(`이미지 ${items.length}장 받는 중…`);
    for (const it of items) {
      await saveImage(it.comp, it.name);
      await new Promise((r) => setTimeout(r, 450));
    }
    setBusy(null);
  };

  const saveVideo = async (comp: Comp, name: string) => {
    setBusy("영상 만드는 중…");
    setProgress(0);
    setNote(null);
    try {
      const { blob, ext } = await record(comp, (p) => setProgress(Math.floor(p * 100) / 100));
      download(blob, `${name}.${ext}`);
      if (ext !== "mp4") setNote("이 브라우저는 MP4를 못 만들어서 WebM으로 받았어요. 인스타그램용은 크롬 최신 버전이나 사파리에서 다시 만들어 주세요.");
    } catch (e) {
      setNote((e as Error).message);
    }
    setBusy(null);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => null);
    setNote("캡션을 복사했어요. 올릴 때 붙여 넣으세요.");
  };

  const btn = "rounded-xl border border-line px-3 py-2 text-[13px] font-semibold disabled:opacity-40";

  return (
    <section className="rounded-2xl border border-violet/40 bg-surface p-4">
      <div ref={cats} aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <Nyang mood="smug" size={400} />
        <Nyang mood="happy" size={400} />
      </div>
      <h2 className="text-[16px] font-bold">📱 쇼츠 · 릴스 소재</h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        매일 그날 운세로 새로 만들어져요. 9:16 이미지(PNG)와 영상({video === "mp4" ? "MP4 · 30fps" : video ? "WebM" : "이 브라우저는 지원 안 됨"})을 받아서 그대로 올리면 돼요. 음악은
        올릴 때 앱에서 붙이세요.
      </p>

      <div className="mt-3 flex gap-1.5">
        {[0, 1, 2].map((plus) => (
          <button key={plus} onClick={() => setDay(kstDay(plus))} className={`${btn} ${day === kstDay(plus) ? "border-peach text-peach" : ""}`}>
            {["오늘", "내일", "모레"][plus]} {kstDay(plus).slice(5).replace("-", "/")}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <button onClick={() => setTab("tti")} className={`${btn} flex-1 ${tab === "tti" ? "border-peach text-peach" : ""}`}>
          📅 띠별 운세
        </button>
        <button onClick={() => setTab("type")} className={`${btn} flex-1 ${tab === "type" ? "border-peach text-peach" : ""}`}>
          🃏 16유형
        </button>
      </div>

      {busy && (
        <div className="mt-3 rounded-xl bg-peach/10 p-3 text-[13px] text-peach">
          {busy}
          {busy.startsWith("영상") && (
            <>
              {" "}
              {Math.round(progress * 100)}% · 끝날 때까지 이 탭을 열어 두세요
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-peach" style={{ width: `${progress * 100}%` }} />
              </div>
            </>
          )}
        </div>
      )}
      {note && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-[12.5px] text-muted">{note}</p>}

      {!data || !comps ? (
        <p className="py-6 text-center text-[13px] text-muted">소재를 그리는 중…</p>
      ) : tab === "tti" ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Thumb comp={comps.list} />
              <button onClick={() => saveImage(comps.list, `nyang-tti-${data.day}`)} disabled={!!busy} className={`${btn} mt-2 w-full`}>
                🖼 12띠 한 장 (PNG)
              </button>
            </div>
            <div>
              <Thumb comp={comps.video} />
              <button onClick={() => saveVideo(comps.video, `nyang-tti-${data.day}-rank`)} disabled={!!busy || !video} className={`${btn} mt-2 w-full`}>
                🎬 순위 공개 영상 ({Math.round(comps.video.duration)}초)
              </button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">캡션</p>
              <button onClick={() => copy(data.ttiCaption)} className={btn}>
                캡션 복사
              </button>
            </div>
            <textarea readOnly value={data.ttiCaption} rows={6} className="mt-2 w-full rounded-xl border border-line bg-black/30 p-3 text-[12.5px]" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">띠별 12장 (캐러셀·스토리용)</p>
              <button onClick={() => saveAll(comps.cards)} disabled={!!busy} className={btn}>
                12장 전부 받기
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {comps.cards.map(({ r, comp, name }) => (
                <button key={r.animal} onClick={() => saveImage(comp, name)} disabled={!!busy} className="text-left">
                  <Thumb comp={comp} />
                  <span className="mt-1 block text-center text-[11.5px] text-muted">
                    {r.emoji} {r.animal} {r.score}점
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] text-muted">유형 카드는 날짜와 상관없이 늘 같아요.</p>
            <button onClick={() => saveAll(comps.types.map((x) => ({ comp: x.card, name: x.name })))} disabled={!!busy} className={btn}>
              16장 전부 받기
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {comps.types.map(({ ty, card, video: clip, name }) => (
              <div key={ty.code}>
                <Thumb comp={card} />
                <p className="mt-1 truncate text-center text-[12px] font-semibold">
                  {ty.emoji} {ty.name}
                </p>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  <button onClick={() => saveImage(card, name)} disabled={!!busy} className={`${btn} px-1`}>
                    이미지
                  </button>
                  <button onClick={() => saveVideo(clip, name)} disabled={!!busy || !video} className={`${btn} px-1`}>
                    영상
                  </button>
                  <button onClick={() => copy(ty.caption)} className={`${btn} px-1`}>
                    캡션
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
