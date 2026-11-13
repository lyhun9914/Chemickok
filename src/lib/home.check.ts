// self-check: npx tsx src/lib/home.check.ts
import assert from "node:assert/strict";
import { cleanHome, heroMode, openTarget } from "./home";

const at = (iso: string) => Date.parse(iso);
assert.equal(heroMode({ hero: "auto" }, at("2026-11-30T15:00:00Z")), "newyear"); // 12월 1일 0시 KST
assert.equal(heroMode({ hero: "auto" }, at("2026-11-30T14:59:00Z")), null);
assert.equal(heroMode({ hero: "auto" }, at("2027-01-31T14:59:00Z")), "newyear");
assert.equal(heroMode({ hero: "auto" }, at("2027-01-31T15:00:00Z")), null); // 2월 1일 KST
assert.equal(heroMode({ hero: "off" }, at("2026-12-15T00:00:00Z")), null);
assert.equal(heroMode({ hero: "saju" }, at("2026-06-01T00:00:00Z")), "saju");
assert.deepEqual(cleanHome({ hero: "couple" }), { ok: true, value: { hero: "couple" } });
assert.equal(cleanHome({ hero: "toString" }).ok, false);
assert.equal(cleanHome(null).ok, false);
assert.deepEqual(openTarget("bujeok"), { game: "exam" });
assert.deepEqual(openTarget("newyear"), { mode: "newyear" });
assert.deepEqual(openTarget("tarot"), { game: "tarot" });
console.log("home.check ok");
