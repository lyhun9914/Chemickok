"""읽기 전용 MCP 서버 검사: python3 scripts/check-mcp.py
가리기(이메일·전화) 확인 → 두 서버를 stdio 로 띄워 도구 목록 → 키 없이 불러 깔끔한 오류인지 본다(키가 들어간 뒤엔 결과가 나온다).
"""

import importlib.util
import sys
from pathlib import Path

import anyio
from mcp.client.client import Client
from mcp.client.stdio import StdioServerParameters

ROOT = Path(__file__).resolve().parent.parent
SERVERS = {"toss": ("toss_transactions", {"start": "2026-11-01", "end": "2026-11-02"}), "nyangsin-admin": ("nyang_day", {"site": "test"})}

spec = importlib.util.spec_from_file_location("admin_mcp", ROOT / "mcp/nyangsin-admin/server.py")
admin = importlib.util.module_from_spec(spec)
spec.loader.exec_module(admin)
assert admin.mask_email("abcdef@gmail.com") == "ab***@gmail.com"
assert admin.mask("메일 abcdef@naver.com 폰 010-1234-5678") == "메일 ab***@naver.com 폰 010-****-5678"
assert admin.mask("01012345678") == "010-****-5678"
assert admin.mask(None) is None


async def main() -> None:
    for name, (tool, args) in SERVERS.items():
        async with Client(StdioServerParameters(command=sys.executable, args=[str(ROOT / f"mcp/{name}/server.py")])) as c:
            tools = [t.name for t in (await c.list_tools()).tools]
            r = await c.call_tool(tool, args)
            text = r.content[0].text if r.content else ""
            print(f"{name}: {tools}\n  {tool} -> {'오류' if r.is_error else '결과'}: {text[:160]}")


anyio.run(main)
