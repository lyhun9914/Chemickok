import type { MetadataRoute } from "next";
import { allIlju } from "@/engine/ilju";
import { allTti } from "@/engine/tti";
import { SITE } from "@/lib/site";

/** The pages search engines should know: the shop, and the 60일주 · 12띠 pages people search for. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/ilju`, changeFrequency: "monthly", priority: 0.8 },
    ...allIlju().map((c) => ({ url: `${SITE}/ilju/${encodeURIComponent(c.ganji)}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${SITE}/tti`, changeFrequency: "daily", priority: 0.8 },
    ...allTti().map((t) => ({ url: `${SITE}/tti/${encodeURIComponent(t.animal)}`, changeFrequency: "daily" as const, priority: 0.6 })),
    { url: `${SITE}/pricing`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
