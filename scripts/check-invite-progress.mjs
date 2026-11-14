// 친구 초대 단계 보상 검사: node --experimental-strip-types scripts/check-invite-progress.mjs
import assert from "node:assert/strict";
import { INVITE_COINS, INVITE_LIMIT, inviteProgress } from "../src/lib/config.ts";

assert.equal(INVITE_COINS, 1, "초대 보상 냥은 그대로");
assert.equal(INVITE_LIMIT, 20, "초대 상한은 그대로");
assert.equal(inviteProgress(0).line, "친구 0명 왔다냥 · 3명 더 오면 🏮 단골 배지");
assert.equal(inviteProgress(2).line, "친구 2명 왔다냥 · 1명 더 오면 🏮 단골 배지");
assert.deepEqual(inviteProgress(2).earned, []);
assert.deepEqual(inviteProgress(3).earned, ["🏮 단골 배지"]);
assert.equal(inviteProgress(3).line, "친구 3명 왔다냥 · 7명 더 오면 🐾 수제자 배지");
assert.deepEqual(inviteProgress(10).earned, ["🏮 단골 배지", "🐾 수제자 배지"]);
assert.equal(inviteProgress(20).line, "친구 20명 왔다냥 · 배지 다 모았다냥");
assert.equal(inviteProgress(20).next, null);
console.log("invite progress ok");
