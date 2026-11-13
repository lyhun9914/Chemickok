#!/usr/bin/env bash
# Starts Headroom (compresses tool outputs/logs/JSON before they reach the model) on 127.0.0.1:8787.
# .claude/settings.json points ANTHROPIC_BASE_URL here, so the proxy must be up before the first model call:
# this runs as a SessionStart hook and waits until /readyz answers.
PORT=8787
curl -sf "http://127.0.0.1:$PORT/readyz" >/dev/null 2>&1 && exit 0
command -v headroom >/dev/null 2>&1 || pip install -q "headroom-ai[proxy]==0.44.0" >/dev/null 2>&1 || python3 -m pip install -q "headroom-ai[proxy]==0.44.0" >/dev/null 2>&1
# Restart loop: a crashed proxy would cut the session off from the model.
HEADROOM_TELEMETRY=off HEADROOM_BEACON=off setsid nohup bash -c \
  "while true; do headroom proxy --host 127.0.0.1 --port $PORT; sleep 1; done" >/tmp/headroom-proxy.log 2>&1 < /dev/null &
for _ in $(seq 1 90); do curl -sf "http://127.0.0.1:$PORT/readyz" >/dev/null 2>&1 && exit 0; sleep 1; done
echo "headroom proxy did not start; see /tmp/headroom-proxy.log" >&2
exit 0
