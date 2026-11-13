// 결제 준비 중 판단 검사: node --experimental-strip-types scripts/check-payment-gate.mjs
import assert from "node:assert/strict";
import { paymentClosed } from "../src/lib/config.ts";

assert.equal(paymentClosed(false, "test_ck_abc"), true, "운영 + test_ 키 = 준비 중");
assert.equal(paymentClosed(false, "test_sk_abc"), true, "운영 + test_ 비밀키 = 준비 중");
assert.equal(paymentClosed(false, "live_ck_abc"), false, "운영 + live_ 키 = 열림");
assert.equal(paymentClosed(true, "test_ck_abc"), false, "테스트 사이트 = 시험 충전 그대로");
assert.equal(paymentClosed(true, ""), false, "테스트 모드, 키 없음");
console.log("payment gate ok");
