#!/usr/bin/env python3
"""PostToolUse hook: shrink large Bash / MCP (connector) outputs with Headroom before the model reads them.

The host pins the API base URL in cloud sessions, so Headroom's proxy can't sit in the request path;
Claude Code's `updatedToolOutput` lets this hook do the same job per tool call instead.
Read/Edit/Grep are never touched (edits need exact text). The original is kept on disk and the
compressed output says where, so nothing is lost. Any failure leaves the output as it was.
"""
import hashlib
import json
import os
import sys

MIN_CHARS = 6000  # smaller outputs are not worth the ~1-3 s
ORIG_DIR = "/tmp/headroom-originals"


def shrink(text, tool):
    os.environ.setdefault("HEADROOM_OFFLINE", "1")  # no update check, beacon or model download
    from headroom import compress

    msgs = [
        {"role": "user", "content": "tool output"},
        {"role": "assistant", "content": [{"type": "tool_use", "id": "t", "name": tool, "input": {}}]},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "t", "content": text}]},
    ]
    r = compress(msgs, model="claude-sonnet-4-5")
    out = r.messages[-1]["content"][0]["content"]
    if not isinstance(out, str) or r.tokens_after > 0.8 * r.tokens_before:
        return None
    # originals can hold customer mail or DB rows: owner-only dir and files, never follow a planted symlink
    os.makedirs(ORIG_DIR, mode=0o700, exist_ok=True)
    os.chmod(ORIG_DIR, 0o700)
    path = f"{ORIG_DIR}/{hashlib.sha1(text.encode()).hexdigest()[:12]}.txt"
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(text)
    return f"{out}\n[headroom: {r.tokens_before}→{r.tokens_after} tokens. 원본 전체: {path}]"


def updated(ev):
    name, resp = ev.get("tool_name", ""), ev.get("tool_response")
    if ORIG_DIR in json.dumps(ev.get("tool_input", {})):
        return None  # reading an original back: pass it through whole
    if name == "Bash" and isinstance(resp, dict) and len(resp.get("stdout") or "") >= MIN_CHARS:
        new = shrink(resp["stdout"], name)
        return dict(resp, stdout=new) if new else None
    if name.startswith("mcp__"):
        if isinstance(resp, str) and len(resp) >= MIN_CHARS:
            return shrink(resp, name)
        blocks = resp.get("content") if isinstance(resp, dict) else resp
        if isinstance(blocks, list) and blocks and all(isinstance(b, dict) and b.get("type") == "text" for b in blocks):
            text = "\n".join(b.get("text", "") for b in blocks)
            new = len(text) >= MIN_CHARS and shrink(text, name)
            if new:
                out = [{"type": "text", "text": new}]
                return dict(resp, content=out) if isinstance(resp, dict) else out
    return None


def main():
    try:
        new = updated(json.load(sys.stdin))
    except Exception:
        return  # never block or alter a tool result because of this hook
    if new is not None:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "updatedToolOutput": new}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
