import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { IS_TEST } from "@/lib/stage";

/** Search engines may read the landing and the 일주 · 띠 pages; the API, payment return pages and admin are not content. */
export default function robots(): MetadataRoute.Robots {
  // the 테스트용 site is never for search engines
  if (IS_TEST) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/payment/", "/admin"] }, sitemap: `${SITE}/sitemap.xml` };
}
