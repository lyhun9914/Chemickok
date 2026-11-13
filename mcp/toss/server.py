"""토스페이먼츠 조회 MCP (읽기 전용, stdio).

키는 여기 없다: 이 환경의 네트워크 비밀로 api.tosspayments.com 에 Basic 인증(시크릿 키)을 넣으면 프록시가 붙인다.
실행: python3 mcp/toss/server.py
"""

import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations

API = "https://api.tosspayments.com"
MAX_DAYS = 7
LIMIT = 1000
READ = ToolAnnotations(read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=True)

mcp = MCPServer("toss_mcp")


def get(path: str) -> object:
    try:
        with urllib.request.urlopen(urllib.request.Request(API + path), timeout=20) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise ToolError("토스 키가 아직 안 들어갔다(네트워크 비밀: api.tosspayments.com Basic).") from None
        try:
            body = json.load(e)
        except ValueError:
            body = {}
        raise ToolError(f"토스 {e.code}: {body.get('code', '')} {body.get('message', '')}".strip()) from None
    except urllib.error.URLError as e:
        raise ToolError(f"토스에 연결 못 함: {e.reason}") from None


def payment_summary(p: dict) -> dict:
    return {
        "orderId": p.get("orderId"),
        "paymentKey": p.get("paymentKey"),
        "orderName": p.get("orderName"),
        "status": p.get("status"),
        "method": p.get("method"),
        "easyPay": (p.get("easyPay") or {}).get("provider"),
        "totalAmount": p.get("totalAmount"),
        "balanceAmount": p.get("balanceAmount"),
        "requestedAt": p.get("requestedAt"),
        "approvedAt": p.get("approvedAt"),
        "cancels": [
            {k: c.get(k) for k in ("canceledAt", "cancelAmount", "cancelReason", "cancelStatus")} for c in p.get("cancels") or []
        ],
        "failure": p.get("failure"),
    }


@mcp.tool(annotations=READ)
def toss_payment(order_id: str = "", payment_key: str = "") -> str:
    """토스 결제 한 건: 상태·금액·수단·승인/취소 시각·취소 내역. order_id 나 payment_key 중 하나."""
    if order_id:
        path = "/v1/payments/orders/" + urllib.parse.quote(order_id, safe="")
    elif payment_key:
        path = "/v1/payments/" + urllib.parse.quote(payment_key, safe="")
    else:
        raise ToolError("order_id 나 payment_key 중 하나를 줘야 한다.")
    return json.dumps(payment_summary(get(path)), ensure_ascii=False)


@mcp.tool(annotations=READ)
def toss_transactions(start: str, end: str) -> str:
    """토스 거래 목록(YYYY-MM-DD ~ YYYY-MM-DD, 최대 7일). 한 줄에 한 건: 시각 주문번호 수단 상태 금액 paymentKey."""
    try:
        s, e = date.fromisoformat(start), date.fromisoformat(end)
    except ValueError:
        raise ToolError("날짜는 YYYY-MM-DD 로.") from None
    if e < s or e - s >= timedelta(days=MAX_DAYS):
        raise ToolError(f"기간은 시작 ≤ 끝, 최대 {MAX_DAYS}일.")
    q = urllib.parse.urlencode({"startDate": f"{s}T00:00:00", "endDate": f"{e}T23:59:59", "limit": LIMIT})
    rows = get("/v1/transactions?" + q)
    lines = [
        " ".join(str(t.get(k)) for k in ("transactionAt", "orderId", "method", "status", "amount", "paymentKey")) for t in rows
    ]
    # shortcut: no startingAfter paging, so a range with more than LIMIT rows is cut; split the range if this shows
    if len(rows) >= LIMIT:
        lines.append(f"(앞 {LIMIT}건만. 기간을 나눠서 다시)")
    return "\n".join(lines) or "거래 없음"


if __name__ == "__main__":
    mcp.run()
