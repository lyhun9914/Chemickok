"""냥신 관리자 API 조회 MCP (읽기 전용 GET, stdio).

키는 여기 없다: 이 환경의 네트워크 비밀로 관리자 주소마다 `Authorization: Bearer <그 사이트의 ADMIN_KEY>` 를 넣으면
프록시가 붙인다. 사이트는 GET 에만 이 헤더를 받는다(src/services/server/admin.ts). 회원 목록은 개인정보라 도구가 없다.
실행: python3 mcp/nyangsin-admin/server.py
"""

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Literal

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations

SITES = {"live": "https://nyangsin-admin.vercel.app", "test": "https://nyangsin-test-admin.vercel.app"}
Site = Literal["live", "test"]
READ = ToolAnnotations(read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=True)

mcp = MCPServer("nyangsin_admin_mcp")


def get(site: Site, path: str, **params) -> dict:
    q = urllib.parse.urlencode({k: v for k, v in params.items() if v not in (None, "")})
    host = SITES[site]
    try:
        with urllib.request.urlopen(urllib.request.Request(f"{host}/api/admin/{path}?{q}"), timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise ToolError(f"관리자 키가 아직 안 들어갔다(네트워크 비밀: {host.split('//')[1]} Bearer).") from None
        try:
            msg = json.load(e).get("error", "")
        except ValueError:
            msg = ""
        raise ToolError(f"관리자 API {e.code}: {msg}".strip()) from None
    except urllib.error.URLError as e:
        raise ToolError(f"관리자 사이트에 연결 못 함: {e.reason}") from None


def mask_email(v: str | None) -> str | None:
    if not v or "@" not in v:
        return v
    name, domain = v.split("@", 1)
    return f"{name[:2]}***@{domain}"


def mask_phone(text: str) -> str:
    return re.sub(r"(01\d)[-. ]?\d{3,4}[-. ]?(\d{4})", r"\1-****-\2", text)


def mask(text: str | None) -> str | None:
    """Free text (건의 본문 등): emails and phone numbers are hidden."""
    return text and mask_phone(re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", lambda m: mask_email(m.group()), text))


def out(v: object) -> str:
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


@mcp.tool(annotations=READ)
def nyang_stats(site: Site = "live") -> str:
    """가입·매출·냥·점괘·초대장·선물 누적/기간 숫자."""
    return out(get(site, "stats"))


@mcp.tool(annotations=READ)
def nyang_day(site: Site = "live") -> str:
    """오늘·어제(KST) 요약: 방문, 면담, 결제, 매출, 환불, 신규 회원, 오류."""
    return out(get(site, "day"))


@mcp.tool(annotations=READ)
def nyang_funnel(site: Site = "live", days: int = 7, product: str = "") -> str:
    """이용 흐름(방문→시작→결과→결제표→결제) + 공유 단추(shareBy: 화면×채널, shareModes) + utm 캠페인(campaigns), 최근 days일(1=오늘, 최대 90). product 로 좁히기."""
    return out(get(site, "funnel", days=days, product=product))


@mcp.tool(annotations=READ)
def nyang_errors(site: Site = "live", hours: int = 24) -> str:
    """최근 오류, 종류별 한 줄: 횟수 출처 마지막시각 경로 메시지."""
    rows = get(site, "errors", hours=hours)["errors"]
    lines = [f"{e['count']}회 {e['source']} {e['last']} {e.get('path') or '-'} {mask((e.get('message') or '')[:200])}" for e in rows]
    return "\n".join(lines) or "오류 없음"


@mcp.tool(annotations=READ)
def nyang_feedback(site: Site = "live", days: int = 14) -> str:
    """건의·점괘 평가(최근 days일): 번호, 종류, 별점, 상태, 본문, 답장, 닉네임, 시각."""
    items = get(site, "feedback", days=days)["items"]
    keep = ("id", "kind", "rating", "tags", "status", "mode", "createdAt", "nickname", "adoptedAt")
    return out([{**{k: f.get(k) for k in keep}, "body": mask(f.get("body")), "reply": mask(f.get("reply")), "memo": mask(f.get("memo"))} for f in items])


@mcp.tool(annotations=READ)
def nyang_payments(site: Site = "live", q: str = "", date_from: str = "", date_to: str = "") -> str:
    """최근 결제(최대 100건). q=주문번호·닉네임·이메일, 날짜 YYYY-MM-DD(KST). 한 줄: 시각 주문번호 수단 금액 냥 환불 회원 paymentKey."""
    rows = get(site, "payments", q=q, **{"from": date_from, "to": date_to})["payments"]
    lines = []
    for p in rows:
        u = p.get("user") or {}
        refund = f"환불{p.get('refund_amount')}@{p['refunded_at']}" if p.get("refunded_at") else "-"
        who = f"{u.get('nickname', '(없음)')}/{u.get('provider', '')}/{mask_email(u.get('email')) or '-'}"
        lines.append(f"{p['created_at']} {p['order_id']} {p['method']} {p['amount']}원 {p.get('coins') or 0}냥 {refund} {who} {p.get('payment_key') or '-'}")
    return "\n".join(lines) or "결제 없음"


if __name__ == "__main__":
    mcp.run()
