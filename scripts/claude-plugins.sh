#!/usr/bin/env bash
# Installs the Claude Code plugins listed in .claude/settings.json (extraKnownMarketplaces + enabledPlugins).
# A cloud session starts on a fresh machine and does not install them by itself, so the
# cloud environment's setup script runs this before Claude starts. Safe to run again.
set -u
cd "$(dirname "$0")/.." || exit 0
command -v claude >/dev/null 2>&1 || exit 0
python3 - <<'EOF' > /tmp/nyang-plugins.txt || exit 0
import json
d = json.load(open(".claude/settings.json"))
for name, m in d.get("extraKnownMarketplaces", {}).items():
    print("M", m["source"]["repo"])
for p, on in d.get("enabledPlugins", {}).items():
    if on:
        print("P", p)
EOF
while read -r kind what; do
  if [ "$kind" = M ]; then
    claude plugin marketplace add "$what" >/dev/null 2>&1 || echo "marketplace failed: $what"
  else
    claude plugin install "$what" --scope project >/dev/null 2>&1 || echo "plugin failed: $what"
  fi
done < /tmp/nyang-plugins.txt
exit 0
