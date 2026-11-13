#!/usr/bin/env bash
# Self-check for scripts/headroom-hook.py: small outputs pass, big logs/JSON shrink with the original kept, bad input is ignored.
set -u
H="$(dirname "$0")/headroom-hook.py"
fail() { echo "FAIL: $1"; exit 1; }
log=$(python3 -c "print('\n'.join(f'INFO step {i} ok' for i in range(800))+'\nFATAL disk full')")
json=$(python3 -c "import json;print(json.dumps([{'id':i,'state':'READY','url':f'x{i}.vercel.app','meta':{'branch':'dev'}} for i in range(300)]))")

[ -z "$(echo '{"tool_name":"Bash","tool_input":{},"tool_response":{"stdout":"hi","stderr":""}}' | python3 "$H")" ] || fail "small output changed"
[ -z "$(echo 'not json' | python3 "$H")" ] || fail "bad input produced output"
out=$(python3 -c "import json,sys;print(json.dumps({'tool_name':'Bash','tool_input':{'command':'x'},'tool_response':{'stdout':sys.argv[1],'stderr':'','interrupted':False}}))" "$log" | python3 "$H")
echo "$out" | python3 -c "
import json,sys,re
r=json.load(sys.stdin)['hookSpecificOutput']['updatedToolOutput']
assert set(r)=={'stdout','stderr','interrupted'}, r.keys()
assert 'FATAL disk full' in r['stdout'] and len(r['stdout'])<5000, 'log not shrunk or error line lost'
p=re.search(r'원본 전체: (\S+)\]',r['stdout']).group(1); assert 'FATAL disk full' in open(p).read()
" || fail "bash log"
out=$(python3 -c "import json,sys;print(json.dumps({'tool_name':'mcp__Vercel__list_deployments','tool_input':{},'tool_response':[{'type':'text','text':sys.argv[1]}]}))" "$json" | python3 "$H")
echo "$out" | python3 -c "
import json,sys
r=json.load(sys.stdin)['hookSpecificOutput']['updatedToolOutput']
assert isinstance(r,list) and r[0]['type']=='text' and len(r[0]['text'])<len(sys.argv[1])*0.8
" "$json" || fail "mcp json"
again=$(python3 -c "import json,sys;print(json.dumps({'tool_name':'Bash','tool_input':{'command':'cat /tmp/headroom-originals/a.txt'},'tool_response':{'stdout':sys.argv[1],'stderr':''}}))" "$log" | python3 "$H")
[ -z "$again" ] || fail "reading an original was compressed"
echo "headroom hook ok"
