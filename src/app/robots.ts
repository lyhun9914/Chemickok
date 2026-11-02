import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Search engines may read the landing and the 일주 · 띠 pages; the API, payment return pages and admin are not content. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/payment/", "/admin"] }, sitemap: `${SITE}/sitemap.xml` };
}
