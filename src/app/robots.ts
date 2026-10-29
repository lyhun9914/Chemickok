import type { MetadataRoute } from "next";

/** Search engines may read the landing; the API and payment return pages are not content. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/payment/"] } };
}
